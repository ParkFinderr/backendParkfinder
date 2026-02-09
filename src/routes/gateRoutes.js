const express = require('express');
const router = express.Router();
const gateController = require('../controllers/gateController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// membuat tiket
router.post('/gate/generateTicket', verifyToken, verifyAdmin, gateController.generateTicket);

// verifikasi tiket
router.post('/access/verify', gateController.verifyTicket);

// cek status tiket
router.get('/access/activeTicket', gateController.getActiveTicket)

module.exports = router;