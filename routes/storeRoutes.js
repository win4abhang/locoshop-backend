const express = require('express');
const router = express.Router();
const Store = require('../models/Store'); // ✅ Add this line

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

// Route to search stores with pagination and query filter
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1, storesPerPage = 50 } = req.query;
    const keyword = query ? query.toLowerCase() : '';
    const pageNum = parseInt(page, 10);
    const limit = parseInt(storesPerPage, 10);
    const skip = (pageNum - 1) * limit;

    // MongoDB query to search stores by name, tags, or address
    const stores = await Store.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } }
      ]
    })
      .skip(skip)
      .limit(limit);

    const totalStores = await Store.countDocuments({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } },
        { address: { $regex: keyword, $options: 'i' } }
      ]
    });

    const totalPages = Math.ceil(totalStores / limit);

    res.json({
      stores,
      page: pageNum,
      totalPages,
      totalStores
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stores' });
  }
});

router.get('/suggestions', getStoreSuggestions);
router.get('/autocomplete', autocompleteStores);
router.get('/', getAllStores);
router.get('/by-name/:name', getStoreByName);
router.put('/update-by-id/:id', updateStoreById);
router.post('/add', addStore);
router.post('/bulk', bulkAddStores);
router.delete('/:id', deleteStoreById);
router.get('/search', searchStores);

module.exports = router;
