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
    // Critical fix: Don't redirect if we're at the login page
    if (req.session && req.session.userId) {
      // Get the stored return URL or default to home
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      return res.redirect(returnTo);
    }
    next();
  }
};