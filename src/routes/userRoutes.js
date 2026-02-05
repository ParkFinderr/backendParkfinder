const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// mengambil profile pengguna
router.get('/users/profile', verifyToken, userController.getProfile);


module.exports = router;