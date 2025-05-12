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
  getAllStores,
  deleteStoreById
} = require("../controllers/storeController");

router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);
router.get('/', getAllStores);
router.get('/by-name/:name', getStoreByName);
router.put('/update-by-id/:id', updateStoreById);
router.post('/add', addStore);
router.post('/bulk', bulkAddStores);
router.delete('/:id', deleteStoreById);

module.exports = router;
