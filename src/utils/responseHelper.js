const sendSuccess = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data
  });
};

// format reesponse error
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message: message,
    data: null
  });
};

// format response server error
const sendServerError = (res, error) => {
  console.error('SERVER ERROR:', error);
  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    error_dev: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

module.exports = { sendSuccess, sendError, sendServerError };