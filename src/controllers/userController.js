const { db }  = require('../config/firebase');
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

// menambah kendaraan user
const addVehicle = async (req, res) => {
  try {
    const { userId } = req.user;

    const { error } = validateAddVehicle(req.body);
    if (error) return sendError(res, 400, error.details[0].message);

    const { plateNumber, vehicleType } = req.body;

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const existingVehicle = userData.vehicles.find(v => v.plateNumber === plateNumber);
    if (existingVehicle) {
      return sendError(res, 400, `Kendaraan dengan plat nomor ${plateNumber} sudah terdaftar di akun Anda.`);
    }

    const newVehicle = { plateNumber, vehicleType };

    await userRef.update({
      vehicles: admin.firestore.FieldValue.arrayUnion(newVehicle)
    });

    return sendSuccess(res, 201, 'Kendaraan berhasil ditambahkan.', newVehicle);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// hapus kendaraan user
const deleteVehicle = async (req, res) => {
  try {
    const { userId } = req.user;
    
    const targetPlateNumber = req.params.id; 

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const targetVehicle = userData.vehicles.find(v => v.plateNumber === targetPlateNumber);

    if (!targetVehicle) {
      return sendError(res, 404, `Kendaraan dengan ID (Plat) ${targetPlateNumber} tidak ditemukan.`);
    }

    if (userData.vehicles.length <= 1) {
      return sendError(res, 400, 'Anda tidak dapat menghapus kendaraan utama (satu-satunya).');
    }

    await userRef.update({
      vehicles: admin.firestore.FieldValue.arrayRemove(targetVehicle)
    });

    return sendSuccess(res, 200, `Kendaraan dengan Plat ${targetPlateNumber} berhasil dihapus.`);
  } catch (error) {
    return sendServerError(res, error);
  }
};

//admin mengambil data user
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let baseQuery = db.collection('users').where('role', '==', 'user');

    const countSnapshot = await baseQuery.count().get();
    const totalData = countSnapshot.data().count;
    const totalPages = Math.ceil(totalData / limit);

    const usersSnapshot = await baseQuery
      .orderBy('createdAt', 'desc') 
      .limit(limit)
      .offset(offset)
      .get();
    
    // 5. Mapping Data (Filter sensitif tetap jalan)
    const allUsers = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: data.userId,
        email: data.email,
        name: data.name,
        role: data.role,
        phoneNumber: data.phoneNumber,
        vehicles: data.vehicles,
        activeTicketId: data.activeTicketId,
        registeredAt: data.createdAt 
      };
    });

    return sendSuccess(res, 200, 'Data pengguna berhasil diambil.', {
      users: allUsers,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalData,
        totalPages: totalPages
      }
    });

  } catch (error) {
    if (error.code === 9) { 
      console.error("INDEX ERROR: Query membutuhkan index komposit di Firestore Console.");
      return sendError(res, 500, 'Server Error: Database Index belum dibuat.');
    }
    return sendServerError(res, error);
  }
};

const deleteUser = async (req, res) => {
  try {

    const targetUserId = req.params.id;
    const currentAdminId = req.user.userId;

    if (targetUserId === currentAdminId) {
      return sendError(res, 400, 'Anda tidak dapat menghapus akun Admin sendiri.');
    }

    const targetUserRef = db.collection('users').doc(targetUserId);
    const doc = await targetUserRef.get();

    if (!doc.exists) {
      return sendError(res, 404, 'User tidak ditemukan.');
    }

    await targetUserRef.delete();

    return sendSuccess(res, 200, 'Pengguna berhasil dihapus dari sistem.');
  } catch (error) {
    return sendServerError(res, error);
  }
};

module.exports = { getProfile, updateProfile, addVehicle, deleteVehicle, getAllUsers, deleteUser };