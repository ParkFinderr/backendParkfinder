const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const slotController = require('../controllers/slotController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// menambah area
router.post('/', verifyToken, verifyAdmin, areaController.createArea);

// mengambil area
router.get('/', areaController.getAllAreas);

// mengambil area dengan id
router.get('/:id', areaController.getAreaById);

// update area
router.put('/:id', verifyToken, verifyAdmin, areaController.updateArea);

// hapus area
router.delete('/:id', verifyToken, verifyAdmin, areaController.deleteArea);



// menambah slot
router.post('/slots', verifyToken, verifyAdmin, slotController.addSlot);

// mengambil slot
router.get('/:id/slots', slotController.getSlotsByArea);

// mengambil slot dengan id
router.get('/slots/:id', slotController.getSlotById);

// update slot 
router.put('/slots/:id', verifyToken, verifyAdmin, slotController.updateSlot);

// hapus slot
router.delete('/slots/:id', verifyToken, verifyAdmin, slotController.deleteSlot);

module.exports = router;