const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');

const {
  getAllUsers,
  createUser,
  deleteUserById,
  updateUserById,
} = require('../controllers/userController');

const requireAuth = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

const SECRET = process.env.JWT_SECRET || 'yourSecretKey';

// Public route: Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, username: user.username, userType: user.userType },
      SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, user: { username: user.username, userType: user.userType } });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Protected routes: Require authentication + admin role
router.use(requireAuth);
router.use(adminMiddleware);

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUserById);
router.delete('/:id', deleteUserById);

module.exports = router;
