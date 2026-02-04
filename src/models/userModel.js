const Joi = require('joi');

// database skema
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


// register
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required(),
  defaultLicensePlate: Joi.string().uppercase().required(),
  vehicleType: Joi.string().valid('mobil', 'motor').default('mobil'),
  fcmToken: Joi.string().optional()
});

// login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  fcmToken: Joi.string().optional()
});

const validateUser = (data) => userSchema.validate(data, { abortEarly: false });
const validateRegister = (data) => registerSchema.validate(data, { abortEarly: false });
const validateLogin = (data) => loginSchema.validate(data, { abortEarly: false });

module.exports = { validateUser, validateRegister, validateLogin };