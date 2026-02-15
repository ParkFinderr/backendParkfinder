const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const slotController = require('../controllers/slotController');
const { verifyToken, verifyAdmin, verifySuperAdmin } = require('../middlewares/authMiddleware');

// super admin membuat area
router.post('/', verifyToken, verifySuperAdmin, areaController.createArea);

// semua user bisa melihat
router.get('/', areaController.getAllAreas);
router.get('/:id', areaController.getAreaById);

// updaet area admin dan user admin
router.put('/:id', verifyToken, verifyAdmin, areaController.updateArea);

// hapus area super admin
router.delete('/:id', verifyToken, verifySuperAdmin, areaController.deleteArea);

// membuat slot baru
router.post('/slots', verifyToken, verifyAdmin, slotController.addSlot);

// melihat sllot 
router.get('/:id/slots', slotController.getSlotsByArea);
router.get('/slots/:id', slotController.getSlotById);

// update slot
router.put('/slots/:id', verifyToken, verifyAdmin, slotController.updateSlot);

// delete slot
router.delete('/slots/:id', verifyToken, verifyAdmin, slotController.deleteSlot);

module.exports = router;