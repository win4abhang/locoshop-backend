const express = require('express');
const router = express.Router();
const {
  addStore,
  bulkAddStores,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  getStoreByName,
  updateStoreById,
  deleteStoreById,
  getAllStoresForAdmin,
  deleteAllStores,
} = require("../controllers/storeController");

// 🧾 Admin panel route
router.get('/admin', getAllStoresForAdmin); // /api/stores/admin?page=1&limit=50

// 🔍 User search
router.get('/ ', searchStores); // /api/stores/search?q=xyz&lat=..&lng=..&page=1

// Other utilities
router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);
router.get('/by-name/:name', getStoreByName);
router.put('/update-by-id/:id', updateStoreById);
router.post('/add', addStore);
router.post('/bulk', bulkAddStores);
router.delete('/:id', deleteStoreById);
router.delete('/', deleteAllStores); // /api/stores
module.exports = router;
