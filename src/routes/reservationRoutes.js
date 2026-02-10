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

// konfirmasi datang di slot parkir
router.patch('/reservations/:id/arrive', reservationController.arriveReservation);

// selesai parkir
router.patch('/reservations/:id/complete', reservationController.completeReservation);

// batal reservasi
router.patch('/reservations/:id/cancel', reservationController.cancelReservation);

module.exports = router;