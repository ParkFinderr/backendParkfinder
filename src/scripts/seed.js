// src/scripts/seed.js

// --- PERBAIKAN: BARIS INI HARUS PALING ATAS ---
// Set Environment Variable DULUAN sebelum require apapun
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; 
process.env.GCLOUD_PROJECT = 'demo-parkfinder'; // Tambahan biar makin yakin ini demo
// ----------------------------------------------

const db = require('../config/firebase'); // Baru panggil database setelah env diset
const { validateArea } = require('../models/areas');
const { validateSlot } = require('../models/slots');

async function seedDatabase() {
  console.log('🌱 Memulai proses seeding sesuai Skripsi...');

  try {
    // --- 1. DATA AREA ---
    const areaId = 'gedung-a'; 
    const areaData = {
      name: "Gedung A - Teknik Elektro",
      address: "Jl. Prof. Sumantri Brojonegoro No.1",
      totalFloors: 1,
      totalSlots: 5,
      availableSlots: 5
    };

    // Validasi Area
    const { error: areaError } = validateArea(areaData);
    if (areaError) throw new Error(`Area Error: ${areaError.message}`);

    // Simpan Area
    await db.collection('areas').doc(areaId).set(areaData);
    console.log(`✅ Area '${areaData.name}' berhasil disimpan.`);

    // --- 2. DATA SLOTS ---
    const slotsBatch = db.batch();
    
    for (let i = 1; i <= 5; i++) {
      const slotName = `A0${i}`;
      
      const slotData = {
        areaId: areaId,
        floor: 1,
        slotName: slotName,
        sensorId: `SENS-${slotName}`,
        sensorStatus: 0,
        currentReservationId: null,
        lastUpdate: new Date(),
        appStatus: 'available'
      };

      // Validasi Slot
      const { error: slotError } = validateSlot(slotData);
      if (slotError) throw new Error(`Slot ${slotName} Error: ${slotError.message}`);

      const slotRef = db.collection('slots').doc(`slot-${slotName}`);
      slotsBatch.set(slotRef, slotData);
    }

    await slotsBatch.commit();
    console.log('✅ 5 Data Slot berhasil disimpan.');
    console.log('🎉 SEEDING SUKSES! Database kini sesuai spesifikasi skripsi.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Gagal Seeding:', error);
    process.exit(1);
  }
}

seedDatabase();