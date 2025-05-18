const express = require('express');
const router = express.Router();

const {
    login,
} = require('../controllers/authController');

// Fix: added leading slash to 'login'
router.post('/login', login);

module.exports = router;