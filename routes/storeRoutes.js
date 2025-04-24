const express = require('express');
const router = express.Router();
const {
  addStore,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  bulkAddStores,
  getStoreByName,      // NEW
  updateStoreById,   // NEW
} = require("../controllers/storeController");

// Search & Suggestion Routes
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);

// Store Management Routes
router.post('/add', addStore);
router.post('/bulk', bulkAddStores);

// NEW: Store by name routes
router.get('/by-name/:name', getStoreByName);
router.put('/update-by-name/:name', updateStoreById);

module.exports = router;
