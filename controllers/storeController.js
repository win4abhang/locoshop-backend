// locoshop-backend/controllers/storeController.js

const Store = require("../models/storeModel");

const searchStores = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    const stores = await Store.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    })
      .limit(3)
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
