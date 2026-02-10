const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// reservasi
router.post('/reservations', verifyToken, reservationController.createReservation);

// mengambil reservasi berdasarkan id
router.get('/reservations/:id', reservationController.getReservationById);

// histori user reservasi
router.get('/users/:userId/reservations', verifyToken, reservationController.getUserReservations);

module.exports = router;