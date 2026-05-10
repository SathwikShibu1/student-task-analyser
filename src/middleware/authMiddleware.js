const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This middleware protects routes that require login.
// It checks for a JWT in the HTTP-only cookie first,
// then falls back to the Authorization header (Bearer token).
async function protect(req, res, next) {
  let token = null;

  // Check cookie first (used when "keep me logged in" is selected)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Fallback: check Authorization header (used by frontend JS fetch calls)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not logged in. Please sign in to continue.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_this');
    // Attach the user object to the request so controllers can use it
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

module.exports = { protect };
