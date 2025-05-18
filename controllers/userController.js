// controllers/userController.js
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude passwords
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create a user
const createUser = async (req, res) => {
  const { username, password, userType } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed, userType });

    await user.save();
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Delete user
const deleteUserById = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Edit user by ID
const updateUserById = async (req, res) => {
    const { username, password, userType } = req.body;
  
    try {
      const update = {
        username,
        userType,
      };
  
      if (password) {
        update.password = await bcrypt.hash(password, 10);
      }
  
      const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  
      if (!user) return res.status(404).json({ error: 'User not found' });
  
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  };

module.exports = {
  getAllUsers,
  createUser,
  deleteUserById,
  updateUserById,
};
