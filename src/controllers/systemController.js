// src/controllers/systemController.js
const { bucket } = require('../config/firebase');
const { sendError, sendServerError } = require('../utils/responseHelper');

const downloadApp = async (req, res) => {
  try {
    const fileName = 'parkfinder.jpeg'; 
    const file = bucket.file(fileName);

    const [exists] = await file.exists();
    if (!exists) {
      return sendError(res, 404, 'File aplikasi belum tersedia.');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');

    const readStream = file.createReadStream();

    readStream.on('error', (err) => {
      console.error('STREAM ERROR:', err);
      if (!res.headersSent) {
        return sendServerError(res, err);
      }
      res.end(); 
    });

    readStream.pipe(res);

  } catch (error) {
    console.error('DOWNLOAD ERROR:', error);
    return sendServerError(res, error);
  }
};

module.exports = { downloadApp };