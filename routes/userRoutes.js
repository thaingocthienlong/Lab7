// File: routes/userRoutes.js
const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Initialize CSRF protection
const csrfProtection = csrf({ cookie: true });

// Login routes - very important to NOT apply isAuthenticated here
router.get('/login', csrfProtection, authMiddleware.redirectIfLoggedIn, userController.getLogin);
router.post('/login', csrfProtection, userController.postLogin);

// Register routes
router.get('/register', csrfProtection, userController.getRegister);
router.post('/register', csrfProtection, userController.postRegister);

// Logout route
router.get('/logout', userController.logout);

module.exports = router;