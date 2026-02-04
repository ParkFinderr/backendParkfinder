// src/models/userModel.js
const Joi = require('joi');

const userSchema = Joi.object({
  // email: (string)
  email: Joi.string().email().required(),
  
  // name: (string)
  name: Joi.string().required(),
  
  // phoneNumber: (string)
  phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required(),
  
  // role: (string) - 'user' atau 'admin'
  role: Joi.string().valid('user', 'admin').default('user'),
  
  // createdAt: (timestamp)
  createdAt: Joi.date().default(Date.now),
  
  // fcmToken: (string) – untuk notifikasi
  fcmToken: Joi.string().allow(null, '').optional(),
  
  // activeTicketId (string | null): tiket yang sedang dipakai
  activeTicketId: Joi.string().allow(null).default(null),
  
  // vehicles: (array) - list kendaraan user
  vehicles: Joi.array().items(
    Joi.object({
      plateNumber: Joi.string().uppercase().required(),
      vehicleType: Joi.string().valid('mobil', 'motor').required()
    })
  ).default([])
});

const validateUser = (data) => {
  return userSchema.validate(data, { abortEarly: false });
};

module.exports = { validateUser };