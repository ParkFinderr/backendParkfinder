// src/models/reservationModel.js
const Joi = require('joi');

const reservationSchema = Joi.object({
  // ticketId (string): akses tiket
  ticketId: Joi.string().required(),

  // userId: (string | null) - null jika tamu
  userId: Joi.string().allow(null).optional(),

  // guestSessionId (string | null) - identitas sementara jika Tamu
  guestSessionId: Joi.string().allow(null).optional(),

  // slotId & slotName
  slotId: Joi.string().required(),
  slotName: Joi.string().required(),

  // plateNumber: (string)
  plateNumber: Joi.string().uppercase().required(),

  // status: (string)
  status: Joi.string().valid(
    'pending',   // baru booking
    'active',    // sudah di lokasi ("Sudah Berada di Parkiran")
    'completed', // selesai ("Meninggalkan Parkiran")
    'swapped',   // pindah slot otomatis
    'cancelled'  // batal/expired
  ).default('pending'),

  // timestamps (map): struktur Object bersarang
  timestamps: Joi.object({
    created: Joi.date().default(Date.now),     // waktu booking
    arrived: Joi.date().allow(null).default(null), // Waktu konfirmasi tiba
    completed: Joi.date().allow(null).default(null) // waktu keluar
  }).required()
});

const validateReservation = (data) => {
  return reservationSchema.validate(data, { abortEarly: false });
};

module.exports = { validateReservation };