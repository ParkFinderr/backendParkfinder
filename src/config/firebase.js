const admin = require('firebase-admin');
require('dotenv').config();

const projectId = process.env.GCLOUD_PROJECT || 'demo-parkfinder';
const storageBucket = process.env.STORAGE_BUCKET || 'demo-parkfinder.appspot.com';

console.log(`[FIREBASE] Initializing in mode: ${process.env.FIRESTORE_EMULATOR_HOST ? 'EMULATOR' : 'CLOUD'}`);

admin.initializeApp({
  projectId: projectId,
  storageBucket: storageBucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Log sederhana untuk memastikan koneksi emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`[FIREBASE] 🔥 Connected to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

module.exports = { admin, db, bucket };