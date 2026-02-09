const express = require('express');
const router = express.Router();
const gateController = require('../controllers/gateController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// membuat tiket
router.post('/gate/generateTicket', verifyToken, verifyAdmin, gateController.generateTicket);

module.exports = router;