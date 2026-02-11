const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const { createReservationSchema, swapReservationSchema } = require('../models/reservationModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');
const { redisClient } = require('../config/redis');


// membuat reservasi baru
const createReservation = async (req, res) => {
  try {
    const { error, value } = createReservationSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { ticketId, slotId, plateNumber, name } = value;
    let successResponseData = null;

    await db.runTransaction(async (t) => {
      const ticketRef = db.collection('tickets').doc(ticketId);
      const slotRef = db.collection('slots').doc(slotId);

      const ticketDoc = await t.get(ticketRef);
      const slotDoc = await t.get(slotRef);

      if (!ticketDoc.exists) throw new Error('TicketNotFound');
      const ticketData = ticketDoc.data();

      if (ticketData.status !== 'claimed') throw new Error('TicketInvalid');
      if (ticketData.linkedReservationId) throw new Error('TicketAlreadyHasReservation');

      if (!slotDoc.exists) throw new Error('SlotNotFound');
      const slotData = slotDoc.data();

      if (slotData.appStatus !== 'available') throw new Error('SlotBusy');

      let finalName = 'Tamu';
      let finalPlateNumber = plateNumber || null;
      const claimedBy = ticketData.claimedBy;

      if (claimedBy && !claimedBy.startsWith('guest-')) {
        const userRef = db.collection('users').doc(claimedBy);
        const userDoc = await t.get(userRef);

        if (userDoc.exists) {
          const userData = userDoc.data();
          finalName = userData.name;

          if (!finalPlateNumber) {
            finalPlateNumber = userData.defaultLicensePlate ||
              (userData.vehicles.length > 0 ? userData.vehicles[0].plateNumber : null);
          }
        }
      } else {
        if (name) finalName = name;
        if (!finalPlateNumber) throw new Error('PlateNumberRequiredForGuest');
        if (!name) throw new Error('NameRequiredForGuest');
      }

      const newReservationRef = db.collection('reservations').doc();
      const reservationData = {
        reservationId: newReservationRef.id,
        ticketId: ticketId,
        userId: claimedBy,
        slotId: slotId,
        slotName: slotData.slotName,
        name: finalName,
        plateNumber: finalPlateNumber,
        status: 'pending',
        timestamps: {
          created: new Date().toISOString(),
          arrived: null,
          completed: null
        },
        history: []
      };

      t.set(newReservationRef, reservationData);

      t.update(slotRef, {
        appStatus: 'booked',
        currentReservationId: newReservationRef.id
      });

      t.update(ticketRef, {
        linkedReservationId: newReservationRef.id
      });

      // redis publish
      const commandPayload = {
        action: 'reserveSlot',
        slotId: slotId,
        slotName: slotData.slotName,
        status: 'booked'
      };

      try {
        await redisClient.publish('parkfinderCommands', JSON.stringify(commandPayload));
        console.log(`[REDIS] Published reserveSlot for ${slotData.slotName}`);
      } catch (redisError) {
        console.error('[REDIS ERROR]', redisError);
      }

      successResponseData = {
        reservationId: newReservationRef.id,
        status: 'pending',
        slotName: slotData.slotName,
        plateNumber: finalPlateNumber,
        name: finalName,
        ticketId: ticketId,
        qrCode: ticketData.qrCode
      };
    });

    return sendSuccess(res, 201, 'Booking berhasil. Silakan menuju slot parkir.', successResponseData);

  } catch (error) {
    if (error.message === 'PlateNumberRequiredForGuest') return sendError(res, 400, 'Tamu wajib mengisi Plat Nomor kendaraan.');
    if (error.message === 'NameRequiredForGuest') return sendError(res, 400, 'Tamu wajib mengisi Nama Pemesan.');
    if (error.message === 'TicketInvalid') return sendError(res, 400, 'Tiket belum di-scan atau sudah tidak aktif.');
    if (error.message === 'TicketAlreadyHasReservation') return sendError(res, 400, 'Tiket ini sudah memiliki reservasi aktif.');
    if (error.message === 'SlotBusy') return sendError(res, 400, 'Slot parkir sudah terisi atau dibooking orang lain.');
    if (error.message === 'TicketNotFound') return sendError(res, 404, 'Tiket tidak ditemukan.');
    if (error.message === 'SlotNotFound') return sendError(res, 404, 'Slot parkir tidak ditemukan.');

    return sendServerError(res, error);
  }
};

// mengambil reservasi berdasarkan id
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('reservations').doc(id).get();
    
    if (!doc.exists) return sendError(res, 404, 'Data reservasi tidak ditemukan.');

    return sendSuccess(res, 200, 'Detail reservasi ditemukan.', doc.data());
  } catch (error) {
    return sendServerError(res, error);
  }
};

// histori user reverrvasi
const getUserReservations = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('reservations')
      .where('userId', '==', userId)
      .orderBy('timestamps.created', 'desc')
      .limit(20)
      .get();

    const data = snapshot.docs.map(doc => doc.data());
    return sendSuccess(res, 200, 'Riwayat reservasi user berhasil diambil.', data);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// konfirmasi  datang di slot parkir
const arriveReservation = async (req, res) => {
  try {
    const { id } = req.params;

    await db.runTransaction(async (t) => {
      const resRef = db.collection('reservations').doc(id);
      const resDoc = await t.get(resRef);
      if (!resDoc.exists) throw new Error('ReservationNotFound');
      
      const data = resDoc.data();
      if (data.status !== 'pending') throw new Error('InvalidStatusForArrive');

      const slotRef = db.collection('slots').doc(data.slotId);
      const slotDoc = await t.get(slotRef);

      // logic sensor
      /*
      if (slotDoc.data().sensorStatus !== 1) {
        throw new Error('sensorNotDetected'); 
      }
      */

      t.update(resRef, { 
        status: 'active', 
        'timestamps.arrived': new Date().toISOString() 
      });

      t.update(slotRef, { appStatus: 'occupied' });

      publishMqttCommand(`parkfinder/control/${slotDoc.data().areaId}/${slotDoc.data().slotName}`, 'setOccupied');
    });

    return sendSuccess(res, 200, 'Kedatangan dikonfirmasi. Selamat parkir.');

  } catch (error) {
    if (error.message === 'SesorNotDetected') return sendError(res, 400, 'Sensor tidak mendeteksi kendaraan. Pastikan mobil sudah parkir dengan benar.');
    if (error.message === 'InvalidStatusForArrive') return sendError(res, 400, 'Status reservasi tidak valid untuk konfirmasi kedatangan.');
    if (error.message === 'ReservationNotFound') return sendError(res, 404, 'Reservasi tidak ditemukan.');
    return sendServerError(res, error);
  }
};

// konfirmasi selesai parkir
const completeReservation = async (req, res) => {
  try {
    const { id } = req.params;

    await db.runTransaction(async (t) => {
 
      const resRef = db.collection('reservations').doc(id);
      const resDoc = await t.get(resRef);
      if (!resDoc.exists) throw new Error('ReservationNotFound');

      const data = resDoc.data();
      if (data.status !== 'active') throw new Error('InvalidStatusForComplete'); 

      const slotRef = db.collection('slots').doc(data.slotId);
      const ticketRef = db.collection('tickets').doc(data.ticketId);
      const userRef = db.collection('users').doc(data.userId);

      const slotDoc = await t.get(slotRef); 
      if (!slotDoc.exists) throw new Error('SlotNotFound');

      t.update(resRef, { 
        status: 'completed', 
        'timestamps.completed': new Date().toISOString() 
      });

      t.update(slotRef, { 
        appStatus: 'available',
        currentReservationId: null
      });

      t.update(ticketRef, { 
        status: 'closed',
        linkedReservationId: null 
      });

      if (data.userId && !data.userId.startsWith('guest-')) {
         t.update(userRef, { activeTicketId: null });
      }

      const areaId = slotDoc.data().areaId;
      const slotName = slotDoc.data().slotName;
      
      publishMqttCommand(`parkfinder/control/${areaId}/${slotName}`, 'setAvailable');
    });

    return sendSuccess(res, 200, 'Parkir selesai. Terima kasih!');

  } catch (error) {

    if (error.message === 'InvalidStatusForComplete') return sendError(res, 400, 'Hanya reservasi aktif yang bisa diselesaikan.');
    if (error.message === 'ReservationNotFound') return sendError(res, 404, 'Reservasi tidak ditemukan.');
    if (error.message === 'SlotNotFound') return sendError(res, 404, 'Data slot parkir hilang.');
    
    // Error umum
    return sendServerError(res, error);
  }
};

// batal reservasi
const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;

    await db.runTransaction(async (t) => {
      const resRef = db.collection('reservations').doc(id);
      const resDoc = await t.get(resRef);
      
      if (!resDoc.exists) throw new Error('ReservationNotFound');
      const data = resDoc.data();

      if (data.status !== 'pending') throw new Error('CannotCancel');

      const slotRef = db.collection('slots').doc(data.slotId);
      const ticketRef = db.collection('tickets').doc(data.ticketId);
      const slotDoc = await t.get(slotRef);

      t.update(resRef, { status: 'cancelled' });

      t.update(slotRef, { 
        appStatus: 'available',
        currentReservationId: null
      });

      t.update(ticketRef, { linkedReservationId: null });

      publishMqttCommand(`parkfinder/control/${slotDoc.data().areaId}/${slotDoc.data().slotName}`, 'setAvailable');
    });

    return sendSuccess(res, 200, 'Reservasi berhasil dibatalkan.');
  } catch (error) {
    if (error.message === 'CannotCancel') return sendError(res, 400, 'Tidak bisa membatalkan reservasi yang sudah aktif atau selesai.');
    return sendServerError(res, error);
  }
};

// pindah reservasi
const swapReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = swapReservationSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { newSlotId } = value;

    await db.runTransaction(async (t) => {

      const resRef = db.collection('reservations').doc(id);
      const resDoc = await t.get(resRef);
      if (!resDoc.exists) throw new Error('RerervationNotFound');
      const data = resDoc.data();

      if (data.status !== 'pending') throw new Error('CannotSwap'); 

      const newSlotRef = db.collection('slots').doc(newSlotId);
      const newSlotDoc = await t.get(newSlotRef);
      if (!newSlotDoc.exists || newSlotDoc.data().appStatus !== 'available') {
        throw new Error('newSlotBusy');
      }

      const oldSlotRef = db.collection('slots').doc(data.slotId);
      const oldSlotDoc = await t.get(oldSlotRef);

      t.update(resRef, {
        slotId: newSlotId,
        slotName: newSlotDoc.data().slotName,
        history: admin.firestore.FieldValue.arrayUnion({
            fromSlot: data.slotName,
            toSlot: newSlotDoc.data().slotName,
            at: new Date().toISOString()
        })
      });

      t.update(oldSlotRef, { 
        appStatus: 'available',
        currentReservationId: null
      });

      t.update(newSlotRef, {
        appStatus: 'booked',
        currentReservationId: id
      });

      publishMqttCommand(`parkfinder/control/${oldSlotDoc.data().areaId}/${oldSlotDoc.data().slotName}`, 'setAvailable');
      publishMqttCommand(`parkfinder/control/${newSlotDoc.data().areaId}/${newSlotDoc.data().slotName}`, 'setReserved'); 
    });

    return sendSuccess(res, 200, 'Berhasil pindah slot.');

  } catch (error) {
    if (error.message === 'newSlotBusy') return sendError(res, 400, 'Slot tujuan tidak tersedia atau tidak ditemukan.');
    if (error.message === 'CannotSwap') return sendError(res, 400, 'Tidak bisa pindah slot setelah check-in.');
    return sendServerError(res, error);
  }
};

module.exports = { createReservation, getReservationById, getUserReservations, arriveReservation, completeReservation, cancelReservation, swapReservation };