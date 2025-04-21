// locoshop-backend/controllers/storeController.js

const Store = require("../models/storeModel");

const getStoreSuggestions = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({ error: "Search query is required." });
    }

    // Get store names and tags that start with the search query
    const stores = await Store.find({
      $or: [
        { name: { $regex: `^${query}`, $options: "i" } },
        { tags: { $regex: `^${query}`, $options: "i" } },
      ],
    })
      .limit(5)  // Return up to 5 suggestions
      .select('name tags')  // Only return name and tags for suggestions
      .exec();

    res.json(stores);
  } catch (error) {
    console.error("Error fetching store suggestions:", error);
    res.status(500).json({ error: "Server error during store suggestions." });
  }
};

module.exports = {
  getStoreSuggestions,
  // other exports
};
