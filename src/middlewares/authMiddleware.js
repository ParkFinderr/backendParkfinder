// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // cek autorisasi pada header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // verfifikasi token
    const secret = process.env.JWT_SECRET
    const decoded = jwt.verify(token, secret);
    
    // simpan data user  ke request
    req.user = decoded; 
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid atau kadaluwarsa.' });
  }
};

module.exports = verifyToken;