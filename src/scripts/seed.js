// src/scripts/seed.js
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; 
process.env.GCLOUD_PROJECT = 'demo-parkfinder';

const db = require('../config/firebase');
const { validateArea } = require('../models/areaModel');
const { validateSlot } = require('../models/slotModel');
const { validateUser } = require('../models/userModel');
const { validateTicket } = require('../models/ticketModel');
const { validateReservation } = require('../models/reservationModel');

async function seedDatabase() {
  console.log('🌱 Memulai Full Seeding Database ParkFinder (Updated Schema)...');

  try {
    const batch = db.batch();

    // ID Unik untuk simulasi relasi
    const userId = 'user-ivan-001';
    const ticketId = 'ticket-QR-XYZ123';
    const reservationId = 'res-001';
    const areaId = 'gedung-a';
    const slotId = 'slot-A01';

    // --- 1. DATA USER ---
    const userData = {
      email: 'ivan@mhs.unila.ac.id',
      name: 'Ivan Alif',
      phoneNumber: '081234567890',
      role: 'user',
      createdAt: new Date(),
      fcmToken: 'token-dummy-firebase-cloud-messaging',
      activeTicketId: ticketId, // User sedang memegang tiket ini
      vehicles: [
        { plateNumber: 'BE 2026 TA', vehicleType: 'mobil' }
      ]
    };
    const { error: userError } = validateUser(userData);
    if (userError) throw new Error(`User Error: ${userError.message}`);
    batch.set(db.collection('users').doc(userId), userData);


    // --- 2. DATA TICKET (Posisi: Sudah di-scan/Claimed) ---
    const ticketData = {
      QrCode: 'QR-XYZ123-SECRET',
      generatedAt: new Date(Date.now() - 3600000), // Dicetak 1 jam lalu
      claimedBy: userId, // Di-scan oleh Ivan
      claimedAt: new Date(Date.now() - 3500000),
      status: 'claimed', // Status claimed karena sudah discan
      linkedReservationId: reservationId // Terhubung ke reservasi
    };
    const { error: ticketError } = validateTicket(ticketData);
    if (ticketError) throw new Error(`Ticket Error: ${ticketError.message}`);
    batch.set(db.collection('tickets').doc(ticketId), ticketData);


    // --- 3. DATA RESERVATION ---
    const resData = {
      ticketId: ticketId,
      userId: userId,
      guestSessionId: null, // Karena member, bukan tamu
      slotId: slotId,
      slotName: 'A01',
      plateNumber: 'BE 2026 TA',
      status: 'active', // "Sudah Berada di Parkiran"
      timestamps: {
        created: new Date(Date.now() - 3500000),
        arrived: new Date(Date.now() - 100000), // Baru sampai
        completed: null
      }
    };
    const { error: resError } = validateReservation(resData);
    if (resError) throw new Error(`Reservation Error: ${resError.message}`);
    batch.set(db.collection('reservations').doc(reservationId), resData);


    // --- 4. DATA AREA ---
    const areaData = {
      name: "Gedung A - Teknik Elektro",
      address: "Unila",
      totalFloors: 1,
      totalSlots: 5,
      availableSlots: 4 // 1 Terisi
    };
    const { error: areaError } = validateArea(areaData);
    if (areaError) throw new Error(`Area Error: ${areaError.message}`);
    batch.set(db.collection('areas').doc(areaId), areaData);


    // --- 5. DATA SLOTS (A01 Terisi, Sisanya Kosong) ---
    for (let i = 1; i <= 5; i++) {
      const slotName = `A0${i}`;
      const isOccupied = (slotName === 'A01');
      
      const slotData = {
        areaId: areaId,
        floor: 1,
        slotName: slotName,
        sensorId: `SENS-${slotName}`,
        sensorStatus: isOccupied ? 1 : 0,
        currentReservationId: isOccupied ? reservationId : null,
        lastUpdate: new Date(),
        appStatus: isOccupied ? 'occupied' : 'available'
      };
      // Note: Pastikan slotModel.js kamu juga sudah update jika ada perubahan, 
      // tapi sepertinya slotModel sebelumnya masih kompatibel.
      const { error: slotError } = validateSlot(slotData);
      if (slotError) throw new Error(`Slot ${slotName} Error: ${slotError.message}`);
      
      batch.set(db.collection('slots').doc(`slot-${slotName}`), slotData);
    }

    // --- EKSEKUSI ---
    await batch.commit();
    console.log('🎉 FULL SEEDING SUKSES! Database sesuai SKRIPSI FINAL.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Gagal Seeding:', error);
    process.exit(1);
  }
}

seedDatabase();