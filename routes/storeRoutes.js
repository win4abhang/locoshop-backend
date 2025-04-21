const express = require('express');
const router = express.Router();
const { searchStores } = require('../controllers/storeController');

router.get('/search', searchStores);

module.exports = router;
