const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/userModel');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const username = 'admin';
    const password = '1234';
    const userType = 'admin'; // 👈 Add the type here

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('User already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      userType,
    });

    await newUser.save();
    console.log('User created successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
