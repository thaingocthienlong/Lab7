const User = require('../models/userModel');
const bcrypt = require('bcrypt');

exports.getRegister = (req, res) => {
  res.render('register', { 
    csrfToken: req.csrfToken(),
    error: null 
  });
};

exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    
    // Simple validation
    if (!name || !email || !password) {
      return res.render('register', { 
        csrfToken: req.csrfToken(),
        error: 'All fields are required' 
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', { 
        csrfToken: req.csrfToken(),
        error: 'Passwords do not match' 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.render('register', { 
        csrfToken: req.csrfToken(),
        error: 'Email already in use' 
      });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword
    });
    
    // Create user directory
    const fs = require('fs-extra');
    const userDir = `${process.env.USER_FILES_DIR}/${newUser.id}`;
    await fs.ensureDir(userDir);
    
    // Redirect to login
    req.flash('success', 'Registration successful. Please login.');
    res.redirect('/user/login');
  } catch (error) {
    console.error(error);
    res.render('register', { 
      csrfToken: req.csrfToken(),
      error: 'Registration failed. Please try again.' 
    });
  }
};

exports.getLogin = (req, res) => {
  // If already logged in, redirect to home
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  
  // Otherwise render the login page
  res.render('login', { 
    csrfToken: req.csrfToken(),
    error: req.flash('error')
  });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    
    // Find user by email
    const User = require('../models/userModel');
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      req.flash('error', 'Invalid username or password');
      return res.render('login', { 
        csrfToken: req.csrfToken(),
        error: 'Invalid username or password' 
      });
    }
    
    // Compare passwords
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      req.flash('error', 'Invalid username or password');
      return res.render('login', { 
        csrfToken: req.csrfToken(),
        error: 'Invalid username or password' 
      });
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.userName = user.name;
    
    // Set remember-me cookie if requested
    if (remember) {
      // Set a persistent cookie (30 days)
      res.cookie('rememberMe', user.id, { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true
      });
    }
    
    // Redirect to home
    const returnTo = req.session.returnTo || '/files';  // Change default to /files
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (error) {
    console.error("Login error:", error);
    res.render('login', { 
      csrfToken: req.csrfToken(),
      error: 'Login failed. Please try again.' 
    });
  }
};

// Also update getLogin to properly check session
exports.getLogin = (req, res) => {
  res.render('login', { 
    csrfToken: req.csrfToken(),
    error: req.flash('error')
  });
};

exports.logout = (req, res) => {
  // Clear session
  req.session.destroy();
  
  // Clear cookies
  res.clearCookie('rememberMe');
  
  // Redirect to login
  res.redirect('/user/login');
};