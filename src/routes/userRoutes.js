const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// mengambil profile pengguna
router.get('/users/profile', verifyToken, userController.getProfile);

//update profile user
router.put('/users/profile', verifyToken, userController.updateProfile);

// menambah kendaraan user
router.post('/users/vehicles', verifyToken, userController.addVehicle);


module.exports = router;