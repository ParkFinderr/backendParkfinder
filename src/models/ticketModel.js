const Joi = require('joi');

// skema membuat tiket parkir
const generateTicketSchema = Joi.object({
  vehicleType: Joi.string().valid('mobil', 'motor').default('mobil').messages({
    'any.only': 'Tipe kendaraan hanya boleh mobil atau motor.'
  }),

  areaId: Joi.string().required().messages({
    'string.empty': 'Area ID wajib diisi saat mencetak tiket.',
    'any.required': 'Area ID wajib disertakan.'
  })
});

// cek tiket parkir
const verifyTicketSchema = Joi.object({
  qrCode: Joi.string().required().messages({
    'string.empty': 'QR Code tidak terbaca.',
    'any.required': 'QR Code wajib dikirim.'
  })
});

module.exports = { generateTicketSchema, verifyTicketSchema };