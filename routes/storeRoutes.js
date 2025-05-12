const express = require('express');
const router = express.Router();
const {
  addStore,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  bulkAddStores,
  getStoreByName,
  updateStoreById,
  getAllStores,        // ✅ New
  deleteStoreById      // ✅ New
} = require("../controllers/storeController");

// Search & Suggestion Routes
router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);

// Store Management Routes
router.get('/', getAllStores);                     // ✅ NEW
router.get('/by-name/:name', getStoreByName);
router.put('/update-by-id/:id', updateStoreById);
router.post('/add', addStore);
router.post('/bulk', bulkAddStores);
router.delete('/:id', deleteStoreById);            // ✅ NEW

module.exports = router;
