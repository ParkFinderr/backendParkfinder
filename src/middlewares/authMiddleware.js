const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHelper');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Akses ditolak. Token autentikasi tidak ditemukan.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET 
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {

    if (error.name === 'TokenExpiredError') {
      return sendError(res, 403, 'Sesi Anda telah berakhir (Token Expired). Silakan login kembali.');
    }
    return sendError(res, 403, 'Token tidak valid. Akses ditolak.');
  }
};

module.exports = verifyToken;