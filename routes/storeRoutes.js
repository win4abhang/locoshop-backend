const express = require('express');
const router = express.Router();
const {
  addStore,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  bulkAddStores,
  getStoreByName,      // Fetch store by name
  updateStoreById,     // Update store by ID
} = require("../controllers/storeController");

// Search & Suggestion Routes
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);

// Store Management Routes
router.post('/add', addStore);
router.post('/bulk', bulkAddStores);

// NEW: Store by name routes
router.get('/by-name/:name', getStoreByName);  // Route to fetch store by name
router.put('/update-by-id/:id', updateStoreById);  // Route to update store by ID (using updateStoreById)

module.exports = router;