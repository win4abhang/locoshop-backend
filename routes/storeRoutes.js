const express = require('express');
const router = express.Router();
const { searchStores, getStoreSuggestions, addStore } = require('../controllers/storeController');  // Add addStore here

// Define your existing GET routes
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);

// Add a POST route for adding stores
router.post('/add', addStore);  // Add this line

module.exports = router;
