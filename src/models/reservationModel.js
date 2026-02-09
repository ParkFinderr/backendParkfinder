const Joi = require('joi');

// skema reservasi 
const createReservationSchema = Joi.object({
  ticketId: Joi.string().required().messages({
    'string.empty': 'Ticket ID wajib diisi.',
    'any.required': 'Ticket ID wajib disertakan.'
  }),
  slotId: Joi.string().required().messages({
    'string.empty': 'Slot ID wajib diisi.',
    'any.required': 'Slot ID wajib dipilih.'
  })
});

// skema pindah reservasi
const swapReservationSchema = Joi.object({
  newSlotId: Joi.string().required().messages({
    'string.empty': 'Slot baru wajib diisi.',
    'any.required': 'Slot baru wajib dipilih untuk pindah.'
  })
});

module.exports = { createReservationSchema, swapReservationSchema };