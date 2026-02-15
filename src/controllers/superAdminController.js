// src/controllers/superAdminController.js
const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError, sendServerError } = require('../utils/responseHelper');

// daftar admin area
const registerAreaAdmin = async (req, res) => {
  try {
    const { email, password, name, phoneNumber, areaId } = req.body;

    if (!email || !password || !name || !areaId) {
      return sendError(res, 400, 'Email, Password, Nama, dan Area ID wajib diisi.');
    }

    const areaDoc = await db.collection('areas').doc(areaId).get();
    if (!areaDoc.exists) {
      return sendError(res, 404, 'Area ID tidak ditemukan. Pastikan Area sudah dibuat terlebih dahulu.');
    }

    const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userQuery.empty) {
      return sendError(res, 400, 'Email sudah terdaftar dalam sistem.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserRef = db.collection('users').doc();
    const newUserId = newUserRef.id;

    const adminData = {
      userId: newUserId,
      email,
      name,
      password: hashedPassword,
      phoneNumber: phoneNumber || '',
      role: 'admin',              
      managedAreaId: areaId,       
      adminCreatedBy: req.user.userId, 
      createdAt: new Date(),
      fcmToken: null,
      activeTicketId: null,
      vehicles: []                 
    };

    await newUserRef.set(adminData);

    return sendSuccess(res, 201, 'Admin Area berhasil didaftarkan.', {
      userId: newUserId,
      email,
      name,
      managedAreaId: areaId
    });

  } catch (error) {
    return sendServerError(res, error);
  }
};

// lihat semua admin area
const getAllAreaAdmins = async (req, res) => {
  try {

    const snapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();

    const admins = [];
    
    const promises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      if (data.managedAreaId) {
        let areaName = 'Unknown Area';
        
        const areaDoc = await db.collection('areas').doc(data.managedAreaId).get();
        if (areaDoc.exists) {
            areaName = areaDoc.data().name;
        }

        return {
          userId: data.userId,
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          managedAreaId: data.managedAreaId,
          areaName: areaName, 
          createdAt: data.createdAt
        };
      }
      return null;
    });

    const results = await Promise.all(promises);

    const filteredAdmins = results.filter(item => item !== null);

    return sendSuccess(res, 200, 'Daftar Admin Area berhasil diambil.', filteredAdmins);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// hapus admin area
const deleteAreaAdmin = async (req, res) => {
  try {
    const { id } = req.params;


    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return sendError(res, 404, 'Admin tidak ditemukan.');
    }

    const userData = userDoc.data();

    if (!userData.managedAreaId) {
      return sendError(res, 403, 'Tindakan DITOLAK. Anda tidak bisa menghapus akun Super Admin melalui fitur ini.');
    }

    await db.collection('users').doc(id).delete();

    return sendSuccess(res, 200, 'Admin Area berhasil dihapus dari sistem.');
  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { registerAreaAdmin, getAllAreaAdmins, deleteAreaAdmin };