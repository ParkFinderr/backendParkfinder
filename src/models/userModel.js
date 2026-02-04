const Joi = require('joi');

// --- database skema ---
const userSchema = Joi.object({
  userId: Joi.string().required(), 
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  password: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
  createdAt: Joi.date().default(Date.now),
  fcmToken: Joi.string().allow(null, '').optional(),
  activeTicketId: Joi.string().allow(null).default(null),
  
  // array kendaraan
  vehicles: Joi.array().items(
    Joi.object({
      plateNumber: Joi.string().uppercase().required(),
      vehicleType: Joi.string().valid('mobil', 'motor').required()
    })
  ).default([])
});

const validateUser = (data) => userSchema.validate(data, { abortEarly: false });

module.exports = { validateUser, validateRegister, validateLogin };