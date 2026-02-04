require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Route Check (Health Check)
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'ParkFinder Backend API is Running...',
    timestamp: new Date()
  });
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`[SERVER] ParkFinder berjalan di http://localhost:${PORT}`);
});