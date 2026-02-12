const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');
require('dotenv').config();

const storageBucket = process.env.STORAGE_BUCKET || 'demo-parkfinder.appspot.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.GCLOUD_PROJECT || serviceAccount.project_id,
  storageBucket: storageBucket 
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

console.log(`[FIREBASE] Project ID: ${process.env.GCLOUD_PROJECT}`);
console.log(`[FIREBASE] Storage Bucket: ${storageBucket}`);

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`[FIREBASE] 🔥 Menggunakan Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

module.exports = { admin, db, bucket };