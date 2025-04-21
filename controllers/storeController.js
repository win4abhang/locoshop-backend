// locoshop-backend/controllers/storeController.js

const Store = require("../models/storeModel");

const searchStores = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const stores = await Store.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    })
      .skip(skip)
      .limit(limit)
      .exec();

    res.json(stores);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error during store search." });
  }
};

module.exports = {
  searchStores,
};
