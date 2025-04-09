const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const csrf = require('csurf');
const multer = require('multer');
const path = require('path');

// Initialize CSRF protection
const csrfProtection = csrf({ cookie: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Temporarily store uploads in the uploads directory
    cb(null, 'static/uploads');
  },
  filename: function(req, file, cb) {
    // Use original filename
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  },
  fileFilter: function(req, file, cb) {
    // Disallow executable files
    const filetypes = /exe|msi|sh/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(new Error('Executable files are not allowed'), false);
    }
    cb(null, true);
  }
});

// Routes
router.get('/', csrfProtection, fileController.getIndex);
router.get('/folder/:path(.*)', csrfProtection, fileController.getFolder);
router.post('/create-folder', csrfProtection, fileController.createFolder);
router.post('/create-file', csrfProtection, fileController.createFile);
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/rename', csrfProtection, fileController.renameItem);
router.post('/delete', csrfProtection, fileController.deleteItem);
router.get('/download/:type/:path(.*)', fileController.downloadItem);
router.get('/search', fileController.searchItems);

module.exports = router;