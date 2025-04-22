const express = require('express');
const router = express.Router();
const { addStore, searchStores, getStoreSuggestions, autocompleteStores } = require("../controllers/storeController");

// Define your existing GET routes
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);

// Add a POST route for adding stores
router.post('/add', addStore);  // Add this line
router.get("/autocomplete", autocompleteStores);


module.exports = router;
