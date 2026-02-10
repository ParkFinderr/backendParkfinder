const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const { createReservationSchema, swapReservationSchema } = require('../models/reservationModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');


// mqqt trigger
// untuk testing sebelum dengan mqtt asli
const publishMqttCommand = (topic, message) => {
  console.log(`[MQTT OUT] Topic: ${topic} | Payload: ${message}`);
};

// membuat reservasi baru
const createReservation = async (req, res) => {
  try {
    
    const { error, value } = createReservationSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { ticketId, slotId } = value;

    await db.runTransaction(async (t) => {
      
      const ticketRef = db.collection('tickets').doc(ticketId);
      const slotRef = db.collection('slots').doc(slotId);
      
      const ticketDoc = await t.get(ticketRef);
      const slotDoc = await t.get(slotRef);

      
      if (!ticketDoc.exists) throw new Error('TICKET_NOT_FOUND');
      const ticketData = ticketDoc.data();

      if (ticketData.status !== 'claimed') throw new Error('TICKET_INVALID'); 
      if (ticketData.linkedReservationId) throw new Error('TICKET_ALREADY_HAS_RESERVATION');

      if (!slotDoc.exists) throw new Error('SLOT_NOT_FOUND');
      const slotData = slotDoc.data();

      if (slotData.appStatus !== 'available') throw new Error('SLOT_BUSY');

      const newReservationRef = db.collection('reservations').doc();
      const reservationData = {
        reservationId: newReservationRef.id,
        ticketId: ticketId,
        userId: ticketData.claimedBy, 
        slotId: slotId,
        slotName: slotData.slotName,
        plateNumber: null,
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

      publishMqttCommand(`parkfinder/control/${slotData.areaId}/${slotData.slotName}`, 'setReserved');
    });

    return sendSuccess(res, 201, 'Booking berhasil. Silakan menuju slot parkir.');

  } catch (error) {
    if (error.message === 'TicketInvalid') return sendError(res, 400, 'Tiket belum di-scan atau sudah tidak aktif.');
    if (error.message === 'TicketAlreadyHasReservation') return sendError(res, 400, 'Tiket ini sudah memiliki reservasi aktif.');
    if (error.message === 'SlotBusy') return sendError(res, 400, 'Slot parkir sudah terisi atau dibooking orang lain.');
    if (error.message === 'TicketNotFound') return sendError(res, 404, 'Tiket tidak ditemukan.');
    if (error.message === 'SlotNotFound') return sendError(res, 404, 'Slot parkir tidak ditemukan.');
    return sendServerError(res, error);
  }
};

module.exports = { createReservation}