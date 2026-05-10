const User = require('../models/User');
const generateToken = require('../utils/token');

async function getProfile(req, res) {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email
  });
}

async function updateProfile(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // If email is being changed, make sure no one else has it
    if (email && email !== user.email) {
      const taken = await User.findOne({ email });
      if (taken) {
        res.status(409);
        throw new Error('That email is already used by another account');
      }
    }

    user.name  = name  || user.name;
    user.email = email || user.email;
    if (password) user.password = password; // pre-save hook will hash it

    const updated = await user.save();
    const token = generateToken(updated._id);

    res.json({
      token,
      user: { _id: updated._id, name: updated.name, email: updated.email }
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Current and new password are required');
    }
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }

    const user = await User.findById(req.user._id);
    const match = await user.matchPassword(currentPassword);
    if (!match) {
      res.status(401);
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, changePassword };