const express = require('express');
const router = express.Router();
const {
  addStore,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  bulkAddStores, // <-- Add this line
} = require("../controllers/storeController");

// Existing routes
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);

// Store add routes
router.post('/add', addStore);
router.post('/bulk', bulkAddStores); // <-- New bulk upload route

module.exports = router;
