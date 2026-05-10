const jwt = require('jsonwebtoken');

function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'dev_secret_change_this',
    { expiresIn: '30d' }
  );
}

module.exports = generateToken;
