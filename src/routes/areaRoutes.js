const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const slotController = require('../controllers/slotController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// post area
router.post('/', verifyToken, verifyAdmin, areaController.createArea);

// get area
router.get('/', areaController.getAllAreas);

// post slot
router.post('/slots', verifyToken, verifyAdmin, slotController.addSlot);

// get slot
router.get('/:id/slots', slotController.getSlotsByArea);

module.exports = router;