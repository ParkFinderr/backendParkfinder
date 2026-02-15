const  { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateRegister, validateLogin } = require('../models/userModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');

// jwt token
const signToken = (user) => {
  return jwt.sign(
    { 
      userId: user.userId, 
      email: user.email, 
      role: user.role,
      managedAreaId: user.managedAreaId || null
    },
    process.env.JWT_SECRET || 'rahasia_dev_123',
    { expiresIn: '1d' }
  );
};

// register
const register = async (req, res) => {
  try {

    const { error } = validateRegister(req.body);
    if (error) {
      return sendError(res, 400, error.details[0].message);
    }

    const { email, password, name, phoneNumber, defaultLicensePlate, vehicleType, fcmToken } = req.body;

    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userQuery.empty) {
      return sendError(res, 400, 'Email sudah terdaftar. Silakan gunakan email lain atau login.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUserRef = db.collection('users').doc();
    const newUserId = newUserRef.id;

    const userData = {
      userId: newUserId,
      email,
      name,
      password: hashedPassword,
      phoneNumber,
      role: 'user',
      
      managedAreaId: null, 
      adminCreatedBy: null,
    

      createdAt: new Date(),
      fcmToken: fcmToken || null,
      activeTicketId: null,
      vehicles: [{ 
        plateNumber: defaultLicensePlate, 
        vehicleType: vehicleType || 'mobil' 
      }]
    };

    await newUserRef.set(userData);

    const token = signToken(userData);

    return sendSuccess(res, 201, 'Registrasi berhasil! Selamat datang.', {
      token,
      user: { 
        userId: newUserId, 
        email, 
        name, 
        role: 'user',
        managedAreaId: null 
      }
    });

  } catch (error) {
    return sendServerError(res, error);
  }
};

// login
const login = async (req, res) => {
  try {

    const { error } = validateLogin(req.body);
    if (error) {
      return sendError(res, 400, error.details[0].message);
    }

    const { email, password, fcmToken } = req.body;

    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
    if (userQuery.empty) {
      return sendError(res, 400, 'Email atau Password salah.');
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return sendError(res, 400, 'Email atau Password salah.');
    }

    if (fcmToken) {
      await userDoc.ref.update({ fcmToken });
    }

    const token = signToken(userData);

    return sendSuccess(res, 200, 'Login berhasil.', {
      token,
      user: { 
        userId: userData.userId, 
        email: userData.email, 
        name: userData.name, 
        role: userData.role,
        managedAreaId: userData.managedAreaId || null 
      }
    });

  } catch (error) {
    return sendServerError(res, error);
  }
};

// logout
const logout = async (req, res) => {
  try {
    const { userId } = req.user;
    
    await db.collection('users').doc(userId).update({ 
      fcmToken: null,
      lastLogoutAt: Date.now()
    });
    
    return sendSuccess(res, 200, 'Logout berhasil.');

  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { register, login, logout };