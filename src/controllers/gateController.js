const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { generateTicketSchema, verifyTicketSchema } = require('../models/ticketModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');

// membuat tiket parkir
const generateTicket = async (req, res) => {
  try {
  
    const { error, value } = generateTicketSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const timestamp = Date.now();
    const uniqueId = uuidv4().split('-')[0]; 
    const qrCodeString = `PF-${timestamp}-${uniqueId}`;

    const newTicket = {
      qrCode: qrCodeString,
      vehicleType: value.vehicleType,
      generatedAt: new Date().toISOString(),
      status: 'active', 
      claimedBy: null,
      claimedAt: null,
      linkedReservationId: null
    };

    const docRef = await db.collection('tickets').add(newTicket);

    return sendSuccess(res, 201, 'Tiket berhasil dicetak.', {
      ticketId: docRef.id,
      ...newTicket
    });

  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { generateTicket}