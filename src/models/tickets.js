// src/models/ticketModel.js
const Joi = require('joi');

const ticketSchema = Joi.object({
  // QrCode (string): kode unik tiket
  QrCode: Joi.string().required(),

  // generatedAt (timestamp): waktu cetak
  generatedAt: Joi.date().default(Date.now),

  // claimedBy (string | null): id User yang scan
  claimedBy: Joi.string().allow(null).default(null),

  // claimedAt (timestamp | null): waktu scan
  claimedAt: Joi.date().allow(null).default(null),

  // status (string): siklus hidup tiket
  status: Joi.string().valid('active', 'claimed', 'closed').default('active'),
  // active  : baru dicetak, belum discan
  // claimed : sudah discan user (masuk fase reservasi)
  // closed  : selesai parkir / expired

  // linkedReservationId (string | null): koneksi ke reservasi
  linkedReservationId: Joi.string().allow(null).default(null)
});

const validateTicket = (data) => {
  return ticketSchema.validate(data, { abortEarly: false });
};

module.exports = { validateTicket };