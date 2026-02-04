// src/config/firebase.js
const admin = require('firebase-admin');
require('dotenv').config();

// inisialisasi firebase admin mode offline untuk local development
admin.initializeApp({
  projectId: "demo-parkfinder" 
});

const db = admin.firestore();

// mendeteksi jika berada di local emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`[DATABASE] Terhubung ke Emulator di ${process.env.FIRESTORE_EMULATOR_HOST}`);
  db.settings({
    ssl: false,
    host: process.env.FIRESTORE_EMULATOR_HOST
  });
} else {
  // deployment ke production nanti
  console.log('[DATABASE] Terhubung ke Google Cloud Firestore (Production)');
}

module.exports = db;