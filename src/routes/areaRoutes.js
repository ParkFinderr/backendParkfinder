const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const slotController = require('../controllers/slotController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// post area
router.post('/', verifyToken, verifyAdmin, areaController.createArea);