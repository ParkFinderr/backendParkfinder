// src/config/firebase.js
const admin = require('firebase-admin');
require('dotenv').config();

const STORAGE_BUCKET = process.env.STORAGE_BUCKET;

admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT,
  storageBucket: STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Log koneksi (Opsional, untuk debug)
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`[DATABASE] Terhubung ke Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}
if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  console.log(`[STORAGE] Terhubung ke Storage Emulator: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`);
}

module.exports = { db, bucket };