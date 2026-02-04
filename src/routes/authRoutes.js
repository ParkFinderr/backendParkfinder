const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifyToken = require('../middlewares/authMiddleware');

// register
router.post('/register', authController.register);

// login
router.post('/login', authController.login);

module.exports = router;