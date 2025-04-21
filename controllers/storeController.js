const Store = require('../models/storeModel');

// Basic fuzzy search using regex
const searchStores = async (req, res) => {
  try {
    const query = req.query.q;

    const stores = await Store.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ]
    }).limit(3);

    res.json(stores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { searchStores };
