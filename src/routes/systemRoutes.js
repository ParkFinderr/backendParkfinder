const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// router download app
router.get('/app/download', systemController.downloadApp);

module.exports = router;