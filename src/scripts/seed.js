// src/scripts/seed.js
require('dotenv').config(); 
const { db } = require('../config/firebase'); 
const bcrypt = require('bcryptjs');


const PASSWORD_DEFAULT = '123456';

async function cleanCollection(collectionName) {
  const snapshot = await db.collection(collectionName).listDocuments();
  if (snapshot.length === 0) return;
  
  const batch = db.batch();
  snapshot.forEach((doc) => batch.delete(doc));
  await batch.commit();
  console.log(`🧹 Koleksi '${collectionName}' dibersihkan.`);
}

async function seedDatabase() {
  console.log('🌱 --- MEMULAI SEEDING DATABASE MULTI-TENANT ---');

  try {

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(PASSWORD_DEFAULT, salt);

    const superAdminRef = db.collection('users').doc();
    const superAdminId = superAdminRef.id;
    
    await superAdminRef.set({
      userId: superAdminId,
      email: 'super@parkfinder.id',
      name: 'Super Administrator',
      password: hashedPassword,
      phoneNumber: '081200000000',
      role: 'admin',
      managedAreaId: null,
      adminCreatedBy: null,
      createdAt: new Date(),
      fcmToken: null,
      vehicles: []
    });
    console.log(`✅ Super Admin Created`);

    const areaUnilaRef = db.collection('areas').doc();
    const areaUnilaId = areaUnilaRef.id;
    await areaUnilaRef.set({
      name: 'Universitas Lampung (UNILA)',
      address: 'Jl. Prof. Dr. Ir. Sumantri Brojonegoro No.1',
      totalFloors: 1,
      totalSlots: 2,     
      availableSlots: 2,
      isActive: true,
      contactEmail: 'admin.unila@parkfinder.id',
      createdBySuperAdmin: superAdminId,
      createdAt: new Date().toISOString()
    });

    const areaIteraRef = db.collection('areas').doc();
    const areaIteraId = areaIteraRef.id;
    await areaIteraRef.set({
      name: 'Institut Teknologi Sumatera (ITERA)',
      address: 'Jl. Terusan Ryacudu, Way Huwi',
      totalFloors: 2,
      totalSlots: 2,     
      availableSlots: 2,
      isActive: true,
      contactEmail: 'admin.itera@parkfinder.id',
      createdBySuperAdmin: superAdminId,
      createdAt: new Date().toISOString()
    });
    console.log(`✅ 2 Area Created (Unila & Itera)`);


    await db.collection('users').add({
      userId: db.collection('users').doc().id, 
      email: 'admin.unila@parkfinder.id',
      name: 'Admin Parkir UNILA',
      password: hashedPassword,
      phoneNumber: '081211111111',
      role: 'admin',
      managedAreaId: areaUnilaId, 
      adminCreatedBy: superAdminId,
      createdAt: new Date(),
      vehicles: []
    });


    await db.collection('users').add({
      userId: db.collection('users').doc().id,
      email: 'admin.itera@parkfinder.id',
      name: 'Admin Parkir ITERA',
      password: hashedPassword,
      phoneNumber: '081222222222',
      role: 'admin',
      managedAreaId: areaIteraId, 
      adminCreatedBy: superAdminId,
      createdAt: new Date(),
      vehicles: []
    });
    console.log(`✅ 2 Area Admins Created`);

    await db.collection('users').add({
      userId: db.collection('users').doc().id,
      email: 'user@parkfinder.id',
      name: 'Pengguna Aplikasi',
      password: hashedPassword,
      phoneNumber: '081233333333',
      role: 'user',
      managedAreaId: null,
      activeTicketId: null,
      defaultLicensePlate: 'BE 1234 XY',
      vehicles: [{ plateNumber: 'BE 1234 XY', vehicleType: 'mobil' }],
      createdAt: new Date()
    });
    console.log(`✅ User Biasa Created`);

    await db.collection('slots').add({
      areaId: areaUnilaId,
      slotName: 'A-01',
      floor: 1,
      sensorId: 'sensor-unila-01',
      sensorStatus: 0,
      appStatus: 'available',
      currentReservationId: null,
      lastUpdate: new Date().toISOString()
    });
 
    await db.collection('slots').add({
        areaId: areaUnilaId,
        slotName: 'A-02',
        floor: 1,
        sensorId: 'sensor-unila-02',
        sensorStatus: 0,
        appStatus: 'available',
        currentReservationId: null,
        lastUpdate: new Date().toISOString()
      });

    await db.collection('slots').add({
      areaId: areaIteraId,
      slotName: 'B-01',
      floor: 1,
      sensorId: 'sensor-itera-01',
      sensorStatus: 0,
      appStatus: 'available',
      currentReservationId: null,
      lastUpdate: new Date().toISOString()
    });

     await db.collection('slots').add({
        areaId: areaIteraId,
        slotName: 'B-02',
        floor: 1,
        sensorId: 'sensor-itera-02',
        sensorStatus: 0,
        appStatus: 'available',
        currentReservationId: null,
        lastUpdate: new Date().toISOString()
      });
    console.log(`✅ Dummy Slots Created`);

    console.log('\n==========================================');
    console.log('EEDING SELESAI! SILAKAN LOGIN DENGAN:');
    console.log('==========================================');
    console.log('PASSWORD SEMUA AKUN: ' + PASSWORD_DEFAULT);
    console.log('------------------------------------------');
    console.log('1. SUPER ADMIN');
    console.log('   Email: super@parkfinder.id');
    console.log('------------------------------------------');
    console.log('2. ADMIN UNILA (Area ID: ' + areaUnilaId + ')');
    console.log('   Email: admin.unila@parkfinder.id');
    console.log('------------------------------------------');
    console.log('3. ADMIN ITERA (Area ID: ' + areaIteraId + ')');
    console.log('   Email: admin.itera@parkfinder.id');
    console.log('------------------------------------------');
    console.log('4. USER USER');
    console.log('   Email: user@parkfinder.id');
    console.log('==========================================\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Gagal Seeding:', error);
    process.exit(1);
  }
}

seedDatabase();