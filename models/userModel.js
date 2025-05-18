const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensures no two users have the same username
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['admin', 'staff', 'Store', 'consumer'], // Add more roles if needed
    default: 'staff',
  },
});

module.exports = mongoose.model('User', userSchema);
