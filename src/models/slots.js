// src/models/slotModel.js
const Joi = require('joi');

const slotSchema = Joi.object({
  // areaId: (string) - id dokumen dari koleksi area
  areaId: Joi.string().required(),

  // floor: (number) - nomor lantai
  floor: Joi.number().integer().required(),

  // slotName: (string) - nama slot (misal: A01)
  slotName: Joi.string().required(),

  // sensorId: (string) - id perangkat IoT
  sensorId: Joi.string().required(),

  // sensorStatus: (number) - 0 = kosong, 1 = ada
  sensorStatus: Joi.number().valid(0, 1).required(),

  // currentReservationId: (string) - id reservasi aktif null jika tidak ada
  currentReservationId: Joi.string().allow(null, '').optional(),

  // lastUpdate: (timestamp) - waktu terakhir diperbarui
  lastUpdate: Joi.date().default(Date.now),

  // appStatus: (string) - status visualisasi warna
  appStatus: Joi.string().valid('available', 'booked', 'occupied', 'maintenance').required()
});

const validateSlot = (data) => {
  return slotSchema.validate(data, { abortEarly: false });
};

module.exports = { validateSlot };