// src/controllers/authController.js
const db = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateRegister, validateLogin } = require('../models/userModel');

// membuat token jwt
const signToken = (user) => {
  return jwt.sign(
    { 
      userId: user.userId,
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'rahasia_dev_123',
    { expiresIn: '1d' }
  );
};

// register
exports.register = async (req, res) => {
  try {
    // validasi input
    const { error } = validateRegister(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password, name, phoneNumber, defaultLicensePlate, vehicleType, fcmToken } = req.body;

    // cek email 
    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userQuery.empty) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    // hash passwrord
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // membuat userId baru
    const newUserRef = db.collection('users').doc();
    const newUserId = newUserRef.id;

    // menyimpan ke database
    const userData = {
      userId: newUserId,
      email,
      name,
      password: hashedPassword,
      phoneNumber,
      role: 'user', 
      createdAt: new Date(),
      fcmToken: fcmToken || null,
      activeTicketId: null,
      vehicles: [{
        plateNumber: defaultLicensePlate,
        vehicleType: vehicleType || 'mobil'
      }]
    };

    await newUserRef.set(userData);

    // mengirim response
    const token = signToken(userData);
    res.status(201).json({
      success: true,
      message: 'Registrasi Berhasil',
      token,
      data: { userId: newUserId, email, name, role: 'user' }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};