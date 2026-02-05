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
    delete userData.createdAt;

    return sendSuccess(res, 200, 'Data profil berhasil diambil.', userData);
  } catch (error) {
    return sendServerError(res, error);
  }
};

//update profile user
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const { error } = validateUpdateProfile(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { name, phoneNumber } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    if (Object.keys(updateData).length === 0) {
      return sendError(res, 400, 'Tidak ada data yang diubah.');
    }

    await db.collection('users').doc(userId).update(updateData);

    return sendSuccess(res, 200, 'Profil berhasil diperbarui.', { userId, ...updateData });
  } catch (error) {
    return sendServerError(res, error);
  }
};


module.exports = { getProfile, updateProfile };