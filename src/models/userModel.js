const Joi = require('joi');

// pesan eror
const messageHelper = (fieldName) => ({
  'string.base': `${fieldName} harus berupa teks.`,
  'string.empty': `${fieldName} tidak boleh kosong.`,
  'string.email': `Format email tidak valid.`,
  'string.min': `${fieldName} minimal harus {#limit} karakter.`,
  'string.max': `${fieldName} maksimal {#limit} karakter.`,
  'any.required': `${fieldName} wajib diisi.`,
  'any.only': `${fieldName} harus salah satu dari: {#valids}.`,
  'string.pattern.base': `Format ${fieldName} tidak sesuai (hanya angka diperbolehkan).`
});

// aturan database user
const commonRules = {
  email: Joi.string().email().required().messages(messageHelper('Email')),
  
  passwordBasic: Joi.string().required().messages(messageHelper('Password')),
  
  passwordStrict: Joi.string().min(6).required().messages(messageHelper('Password')),
  
  phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required().messages(messageHelper('Nomor Telepon')),
  
  fcmToken: Joi.string().optional()
};

// skema database
const userSchema = Joi.object({
  userId: Joi.string().required(),
  email: commonRules.email,
  name: Joi.string().required().messages(messageHelper('Nama Lengkap')),
  password: commonRules.passwordBasic,
  phoneNumber: commonRules.phoneNumber,
  role: Joi.string().valid('user', 'admin').default('user'),
  createdAt: Joi.date().default(Date.now),
  fcmToken: Joi.string().allow(null, '').optional(),
  activeTicketId: Joi.string().allow(null).default(null),
  
  vehicles: Joi.array().items(
    Joi.object({
      plateNumber: Joi.string().uppercase().required(),
      vehicleType: Joi.string().valid('mobil', 'motor').required()
    })
  ).default([])
});

// register
const registerSchema = Joi.object({
  email: commonRules.email, 
  password: commonRules.passwordStrict,
  name: Joi.string().required().messages(messageHelper('Nama Lengkap')),
  phoneNumber: commonRules.phoneNumber,
  defaultLicensePlate: Joi.string().uppercase().required().messages(messageHelper('Plat Nomor')),
  vehicleType: Joi.string().valid('mobil', 'motor').default('mobil').messages(messageHelper('Jenis Kendaraan')),
  fcmToken: commonRules.fcmToken
});

// login
const loginSchema = Joi.object({
  email: commonRules.email,
  password: commonRules.passwordBasic,
  fcmToken: commonRules.fcmToken
});

// update data user
const updateProfileSchema = Joi.object({
  name: Joi.string().optional().messages(messageHelper('Nama Lengkap')),
  phoneNumber: Joi.string().pattern(/^[0-9]+$/).min(10).max(15).optional().messages(messageHelper('Nomor Telepon'))
});

// tambah kendaraan user
const addVehicleSchema = Joi.object({
  plateNumber: Joi.string().uppercase().required().messages(messageHelper('Plat Nomor')),
  vehicleType: Joi.string().valid('mobil', 'motor').required().messages(messageHelper('Jenis Kendaraan'))
});

const validateUser = (data) => userSchema.validate(data, { abortEarly: false });
const validateRegister = (data) => registerSchema.validate(data, { abortEarly: false });
const validateLogin = (data) => loginSchema.validate(data, { abortEarly: false });
const validateUpdateProfile = (data) => updateProfileSchema.validate(data, { abortEarly: false });
const validateAddVehicle = (data) => addVehicleSchema.validate(data, { abortEarly: false });

module.exports = { validateUser, validateRegister, validateLogin, validateUpdateProfile, validateAddVehicle };