const express = require('express');
const router = express.Router();
const { searchStores, getStoreSuggestions } = require('../controllers/storeController');

router.get('/search', searchStores);
router.get('/suggestions', getStoreSuggestions);  // 👈 Add this line

module.exports = router;
