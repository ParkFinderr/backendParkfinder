// src/controllers/reservationController.js
const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const { createReservationSchema, swapReservationSchema } = require('../models/reservationModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');
const { redisClient } = require('../config/redis');


const broadcastStats = async () => {
    try {
        const allSlots = await db.collection('slots').get();
        let stats = { available: 0, booked: 0, occupied: 0, maintenance: 0 };
        
        allSlots.forEach(doc => {
            const s = doc.data();
            const status = ['available', 'booked', 'occupied', 'maintenance'].includes(s.appStatus) 
                ? s.appStatus 
                : 'available';
            stats[status]++;
        });

        await redisClient.publish('parkfinderStats', JSON.stringify(stats));
        console.log('[STATS] Broadcasted:', stats);
    } catch (err) {
        console.error('[STATS ERROR]', err);
    }
};

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

      if (ticketData.areaId !== slotData.areaId) {
          throw new Error('CrossAreaBookingNotAllowed');
      }

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
        areaId: slotData.areaId,
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

      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 30);

      // redis publish
      const commandPayload = {
        action: 'reserveSlot',
        slotId: slotId,
        slotName: slotData.slotName,
        status: 'booked',
        expiryTime: expiryDate.toISOString(),
        areaId: slotData.areaId 
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
        areaId: slotData.areaId,
        plateNumber: finalPlateNumber,
        name: finalName,
        ticketId: ticketId,
        qrCode: ticketData.qrCode,
        expiryTime: expiryDate.toISOString()
      };
    });

    broadcastStats();

    return sendSuccess(res, 201, 'Booking berhasil. Silakan menuju slot parkir.', successResponseData);

  } catch (error) {
    if (error.message === 'CrossAreaBookingNotAllowed') return sendError(res, 403, 'Tiket Anda tidak berlaku untuk area parkir ini.');
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

// histori user 
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
      const slotData = slotDoc.data();

      if (slotData.sensorStatus !== 1) {
         throw new Error('SensorNotDetected');
      }

      t.update(resRef, {
        status: 'active',
        'timestamps.arrived': new Date().toISOString()
      });

      t.update(slotRef, { appStatus: 'occupied' });

      const commandPayload = {
        action: 'occupySlot',
        slotId: data.slotId,
        slotName: slotData.slotName,
        status: 'occupied',
        areaId: slotData.areaId
      };

      try {
        await redisClient.publish('parkfinderCommands', JSON.stringify(commandPayload));
        console.log(`[REDIS] Published occupySlot for ${slotData.slotName}`);
      } catch (redisError) {
        console.error('[REDIS ERROR]', redisError);
      }
    });

    broadcastStats();
    return sendSuccess(res, 200, 'Kedatangan dikonfirmasi. Selamat parkir.');

  } catch (error) {
    if (error.message === 'SensorNotDetected') {
        return sendError(res, 400, 'Kendaraan belum terdeteksi oleh sensor. Silakan parkirkan mobil Anda dengan benar di slot tersebut sebelum konfirmasi.');
    }
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
      
      const slotDoc = await t.get(slotRef);
      if (!slotDoc.exists) throw new Error('SlotNotFound');

      const isGuest = data.userId && (data.userId.startsWith('guest') || data.userId.includes('guest'));
      let userRef = null;
      let userDoc = null;

      if (data.userId && !isGuest) {
        userRef = db.collection('users').doc(data.userId);
        userDoc = await t.get(userRef); // Baca disini
      }

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

      if (userRef && userDoc && userDoc.exists) {
        t.update(userRef, { activeTicketId: null });
      }

      const commandPayload = {
        action: 'leaveSlot',
        slotId: data.slotId,
        slotName: slotDoc.data().slotName,
        status: 'available',
        areaId: data.areaId
      };

      try {
        await redisClient.publish('parkfinderCommands', JSON.stringify(commandPayload));
        console.log(`[REDIS] Published leaveSlot for ${slotDoc.data().slotName}`);
      } catch (redisError) {
        console.error('[REDIS ERROR]', redisError);
      }
    });

    broadcastStats(); 
    return sendSuccess(res, 200, 'Parkir selesai. Terima kasih!');

  } catch (error) {
    if (error.message === 'InvalidStatusForComplete') return sendError(res, 400, 'Hanya reservasi aktif yang bisa diselesaikan.');
    if (error.message === 'ReservationNotFound') return sendError(res, 404, 'Reservasi tidak ditemukan.');
    if (error.message === 'SlotNotFound') return sendError(res, 404, 'Data slot parkir hilang.');

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

      const isGuest = data.userId && (data.userId.startsWith('guest') || data.userId.includes('guest'));
      let userRef = null;
      let userDoc = null;

      if (data.userId && !isGuest) {
        userRef = db.collection('users').doc(data.userId);
        userDoc = await t.get(userRef); 
      }

      t.update(resRef, { status: 'cancelled' });

      t.update(slotRef, {
        appStatus: 'available',
        currentReservationId: null
      });

      t.update(ticketRef, { 
          status: 'closed',
          linkedReservationId: null 
      });

      if (userRef && userDoc && userDoc.exists) {
          t.update(userRef, { activeTicketId: null });
      }

      const commandPayload = {
        action: 'cancelSlot',
        slotId: data.slotId,
        slotName: slotDoc.exists ? slotDoc.data().slotName : 'UNKNOWN',
        status: 'available',
        reason: 'manual',
        areaId: data.areaId
      };

      try {
        await redisClient.publish('parkfinderCommands', JSON.stringify(commandPayload));
        console.log(`[REDIS] Published cancelSlot for ${commandPayload.slotName}`);
      } catch (redisError) {
        console.error('[REDIS ERROR]', redisError);
      }
    });

    broadcastStats();
    return sendSuccess(res, 200, 'Reservasi berhasil dibatalkan.');
  } catch (error) {
    if (error.message === 'CannotCancel') return sendError(res, 400, 'Tidak bisa membatalkan reservasi yang sudah aktif atau selesai.');
    if (error.message === 'ReservationNotFound') return sendError(res, 404, 'Reservasi tidak ditemukan.');
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

      const createdTime = new Date(data.timestamps.created);
      const originalExpiryTime = new Date(createdTime.getTime() + 30 * 60000);
      const now = new Date();

      if (now > originalExpiryTime) {
          throw new Error('BookingExpired');
      }

      const newSlotRef = db.collection('slots').doc(newSlotId);
      const newSlotDoc = await t.get(newSlotRef);
      if (!newSlotDoc.exists || newSlotDoc.data().appStatus !== 'available') {
        throw new Error('newSlotBusy');
      }

      const oldSlotRef = db.collection('slots').doc(data.slotId);
      const oldSlotDoc = await t.get(oldSlotRef);

      if (oldSlotDoc.data().areaId !== newSlotDoc.data().areaId) {
          throw new Error('CrossAreaSwapNotAllowed');
      }

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

      // redis publish
      try {

        await redisClient.publish('parkfinderCommands', JSON.stringify({
          action: 'cancelSlot',
          slotId: data.slotId,
          slotName: oldSlotDoc.data().slotName,
          status: 'available',
          reason: 'swap',
          areaId: data.areaId
        }));

        await redisClient.publish('parkfinderCommands', JSON.stringify({
          action: 'reserveSlot',
          slotId: newSlotId,
          slotName: newSlotDoc.data().slotName,
          status: 'booked',
          expiryTime: originalExpiryTime.toISOString(),
          areaId: data.areaId 
        }));
        
        console.log(`[REDIS] Swapped from ${oldSlotDoc.data().slotName} to ${newSlotDoc.data().slotName}. Expiry remains: ${originalExpiryTime.toISOString()}`);
      } catch (redisError) {
        console.error('[REDIS ERROR]', redisError);
      }
    });
    
    broadcastStats(); 
    return sendSuccess(res, 200, 'Berhasil pindah slot.');

  } catch (error) {
    if (error.message === 'CrossAreaSwapNotAllowed') return sendError(res, 403, 'Anda hanya bisa pindah ke slot di area yang sama.');
    if (error.message === 'newSlotBusy') return sendError(res, 400, 'Slot tujuan tidak tersedia atau tidak ditemukan.');
    if (error.message === 'CannotSwap') return sendError(res, 400, 'Tidak bisa pindah slot setelah check-in.');
    if (error.message === 'BookingExpired') return sendError(res, 400, 'Waktu booking Anda sudah habis, tidak bisa pindah slot.');
    return sendServerError(res, error);
  }
};

module.exports = { createReservation, getReservationById, getUserReservations, arriveReservation, completeReservation, cancelReservation, swapReservation };