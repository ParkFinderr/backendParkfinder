// src/scripts/seed.js
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; 
process.env.GCLOUD_PROJECT = 'demo-parkfinder';

const db = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { validateUser } = require('../models/userModel');

async function seedAdmin() {
  console.log('🌱 Memulai Seeding: Create ADMIN Account...');

  try {
    // 1. Hash Password Admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 2. Buat ID & Data Admin
    const adminRef = db.collection('users').doc();
    const adminId = adminRef.id;

    const adminData = {
      userId: adminId, // SESUAI REQUEST: userId
      email: 'admin@parkfinder.id',
      name: 'Super Administrator',
      password: hashedPassword,
      phoneNumber: '081199887766',
      role: 'admin', // Role Admin
      createdAt: new Date(),
      fcmToken: null,
      activeTicketId: null,
      vehicles: [] // Admin mungkin tidak input kendaraan
    };

    // 3. Validasi
    const { error } = validateUser(adminData);
    if (error) throw new Error(`Validasi Admin Gagal: ${error.message}`);

    // 4. Simpan
    await adminRef.set(adminData);
    
    console.log(`✅ Admin Berhasil Dibuat!`);
    console.log(`   Email   : admin@parkfinder.id`);
    console.log(`   Password: admin123`);
    console.log(`   UserId  : ${adminId}`);
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Gagal Seeding:', error);
    process.exit(1);
  }
}

seedAdmin();