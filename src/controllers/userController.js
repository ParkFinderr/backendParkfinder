const db = require('../config/firebase');
const admin = require('firebase-admin'); 
const { validateUpdateProfile, validateAddVehicle } = require('../models/userModel');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');

// mengambil profil user
const getProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return sendError(res, 404, 'Data pengguna tidak ditemukan.');
    }

    const userData = userDoc.data();
    
    // Hapus data sensitif
    delete userData.password;
    delete userData.fcmToken;

    return sendSuccess(res, 200, 'Data profil berhasil diambil.', userData);
  } catch (error) {
    return sendServerError(res, error);
  }
};


module.exports = { getProfile };