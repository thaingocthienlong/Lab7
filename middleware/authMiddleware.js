// File: middleware/authMiddleware.js
module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.userId) {
      return next();
    }
    // Store the original URL to redirect after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/user/login');
  },
  
  redirectIfLoggedIn: (req, res, next) => {
    if (req.session && req.session.userId) {
      return res.redirect('/files');  // Redirect to files instead of '/'
    }
    next();
  }
};