// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/responseHelper');
const { db }  = require('../config/firebase');

// verify token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Akses ditolak. Token autentikasi tidak ditemukan.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'rahasia_dev_123';
    
    const decoded = jwt.verify(token, secret);

    const userDoc = await db.collection('users').doc(decoded.userId).get();
    
    if (!userDoc.exists) {
      return sendError(res, 401, 'User tidak ditemukan atau telah dihapus.');
    }

    const userData = userDoc.data();

    if (userData.lastLogoutAt) {
      const lastLogoutTime = userData.lastLogoutAt; 
      const tokenIssuedTime = decoded.iat * 1000;   

      if (tokenIssuedTime < lastLogoutTime) {
        return sendError(res, 401, 'Sesi kadaluwarsa. Token tidak valid setelah logout.');
      }
    }

    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 403, 'Sesi Anda telah berakhir (Token Expired). Silakan login kembali.');
    }
 
    return sendError(res, 403, 'Token tidak valid. Akses ditolak.');
  }
};

// admin
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, 403, 'Akses ditolak. Halaman ini khusus Admin.');
  }
  next();
};

module.exports = { verifyToken, verifyAdmin };