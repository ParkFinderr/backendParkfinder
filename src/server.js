require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectRedis } = require('./config/redis');

// import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const systemRoutes = require('./routes/systemRoutes');
const areaRoutes = require('./routes/areaAndSlotRoutes');
const gateRoutes = require('./routes/gateRoutes')
const reservationRoutes = require('./routes/reservationRoutes');
const { startCronJobs } = require('./service/reservationTime');

// cron
startCronJobs();

const app = express();
const PORT = process.env.PORT;

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// routes
app.use('/auth', authRoutes);
app.use('/', userRoutes);
app.use('/system', systemRoutes);
app.use('/areas', areaRoutes);
app.use('/', gateRoutes);
app.use('/', reservationRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'ParkFinder Backend API Running...', 
    serverTime: new Date() 
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] ParkFinder berjalan di http://localhost:${PORT}`);
});

// const startServer = async () => {
//   try {
//     await connectRedis(); // <--- JALANKAN INI
    
//     app.listen(port, () => {
//       console.log(`[SERVER] ParkFinder berjalan di http://localhost:${port}`);
//     });
//   } catch (error) {
//     console.error('Gagal menjalankan server:', error);
//   }
// }

// startServer();