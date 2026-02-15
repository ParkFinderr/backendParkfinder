const express = require('express');
const router = express.Router();
const { verifyToken, verifySuperAdmin } = require('../middlewares/authMiddleware');
const { registerAreaAdmin, getAllAreaAdmins, deleteAreaAdmin } = require('../controllers/superAdminController');

router.use(verifyToken, verifySuperAdmin);

// mendafrakan admin area
router.post('/registerAdmin', registerAreaAdmin);

// melihat semua admin area
router.get('/admins', getAllAreaAdmins);     

// menghapus admin area
router.delete('/admin/:id', deleteAreaAdmin);      

module.exports = router;