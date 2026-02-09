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


// verifikasi tiket parkir
const verifyTicket = async (req, res) => {
  try {

    const { error, value } = verifyTicketSchema.validate(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { qrCode } = value;
    let userId = null;
    let guestSessionId = null;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        return sendError(res, 401, 'Sesi kadaluarsa. Silakan login kembali atau scan sebagai tamu.');
      }
    } else {
      guestSessionId = `guest-${uuidv4()}`;
    }

    const ticketQuery = await db.collection('tickets')
      .where('qrCode', '==', qrCode)
      .limit(1)
      .get();

    if (ticketQuery.empty) {
      return sendError(res, 404, 'Tiket tidak valid atau tidak ditemukan.');
    }

    const ticketDoc = ticketQuery.docs[0];
    const ticketData = ticketDoc.data();

    if (ticketData.status !== 'active') {
      if (ticketData.status === 'claimed') return sendError(res, 400, 'Tiket ini sudah digunakan (claimed).');
      if (ticketData.status === 'closed') return sendError(res, 400, 'Tiket ini sudah kadaluarsa (closed).');
      return sendError(res, 400, 'Status tiket tidak valid.');
    }

    await db.runTransaction(async (t) => {
      const ticketRef = db.collection('tickets').doc(ticketDoc.id);


      const updateData = {
        status: 'claimed',
        claimedAt: new Date().toISOString(),
        claimedBy: userId ? userId : guestSessionId
      };
      
      t.update(ticketRef, updateData);

      if (userId) {
        const userRef = db.collection('users').doc(userId);
        t.update(userRef, { activeTicketId: ticketDoc.id });
      }
    });

    const responseData = {
      ticketId: ticketDoc.id,
      vehicleType: ticketData.vehicleType,
      userType: userId ? 'registered' : 'guest',
      bindingId: userId ? userId : guestSessionId,
      status: 'claimed'
    };

    return sendSuccess(res, 200, 'Tiket berhasil diverifikasi. Selamat datang!', responseData);

  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { generateTicket}