// src/models/areaModel.js
const Joi = require('joi');

// skema area parkir
const createAreaSchema = Joi.object({
  name: Joi.string().min(3).required().messages({
    'string.empty': 'Nama area parkir wajib diisi.',
    'string.min': 'Nama area parkir minimal 3 karakter.',
    'any.required': 'Nama area parkir wajib diisi.'
  }),
  address: Joi.string().required().messages({
    'string.empty': 'Alamat wajib diisi.',
    'any.required': 'Alamat wajib diisi.'
  }),
  totalFloors: Joi.number().integer().min(1).required().messages({
    'number.base': 'Jumlah lantai harus berupa angka.',
    'number.min': 'Minimal harus ada 1 lantai.',
    'any.required': 'Jumlah lantai wajib diisi.'
  }),
  
  isActive: Joi.boolean().default(true).messages({
    'boolean.base': 'Status aktif harus berupa boolean (true/false).'
  }),
  contactEmail: Joi.string().email().required().messages({
    'string.email': 'Format email kontak area tidak valid.',
    'any.required': 'Email kontak area wajib diisi.'
  })

}).options({ 
  abortEarly: false, 
  errors: { wrap: { label: false } }
}).messages({
  'object.unknown': '{#label} tidak diperbolehkan.' 
});

// update area
const updateAreaSchema = Joi.object({
  name: Joi.string().min(3).optional().messages({
    'string.min': 'Nama area minimal 3 karakter.'
  }),
  address: Joi.string().optional(),
  totalFloors: Joi.number().integer().min(1).optional().messages({
    'number.base': 'Jumlah lantai harus berupa angka.',
    'number.min': 'Minimal harus ada 1 lantai.'
  }),

  isActive: Joi.boolean().optional().messages({
    'boolean.base': 'Status aktif harus berupa boolean.'
  }),
  contactEmail: Joi.string().email().optional().messages({
    'string.email': 'Format email kontak area tidak valid.'
  })

}).options({ 
  abortEarly: false, 
  errors: { wrap: { label: false } } 
}).messages({
  'object.unknown': '{#label} tidak diperbolehkan untuk diupdate.' 
});

module.exports = { createAreaSchema, updateAreaSchema };