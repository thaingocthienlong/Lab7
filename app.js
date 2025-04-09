// app.js - Main application file

// Import required modules
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const fs = require('fs-extra');
const csrf = require('csurf');
require('dotenv').config();

// Initialize database connection
require('./config/database');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');

// Import routes
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');

// Create Express app instance
const app = express();

// Create required directories if they don't exist
fs.ensureDirSync(path.join(__dirname, 'static/uploads'));
fs.ensureDirSync(path.join(__dirname, 'user-files'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(flash());

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Initialize CSRF protection
const csrfProtection = csrf({ cookie: true });

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    name: req.session.userName
  } : null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/user', userRoutes);
app.use('/files', authMiddleware.isAuthenticated, fileRoutes);

// Default route - redirect to files if authenticated, otherwise middleware redirects to login
app.get('/', authMiddleware.isAuthenticated, (req, res) => {
  res.redirect('/files');
});

// Error handling - 404
app.use((req, res, next) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    status: 404
  });
});

// Error handling - 500
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong',
    status: 500
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});