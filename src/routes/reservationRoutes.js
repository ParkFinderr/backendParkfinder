const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// reservasi
router.post('/reservations', reservationController.createReservation);

module.exports = router;