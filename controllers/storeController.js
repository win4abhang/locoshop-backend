const Store = require("../models/storeModel");

// ✅ Add Store Function
const addStore = async (req, res) => {
  try {
    const { name, address, phone, lat, lng, tags } = req.body;

    // Validate inputs
    if (!name || !address || !phone || !lat || !lng || !tags) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const store = new Store({
      name,
      address,
      phone,
      tags,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
    });

    await store.save();
    res.status(201).json({ message: "Store added successfully!" });
  } catch (error) {
    console.error("Add Store Error:", error);
    res.status(500).json({ message: "Server error while adding store." });
  }
};

// ✅ Suggestion Function
const getStoreSuggestions = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.json([]);
    }

    const stores = await Store.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    }).limit(5);

    const transformed = stores.map((store) => {
      const obj = store.toObject();
      obj.latitude = store.location?.coordinates?.[1];
      obj.longitude = store.location?.coordinates?.[0];
      return obj;
    });

    res.json(transformed);
  } catch (err) {
    console.error("Suggestion Error:", err);
    res.status(500).json({ error: "Server error fetching suggestions." });
  }
};

// ✅ Search Function
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

    const transformed = stores.map((store) => {
      const obj = store.toObject();
      obj.latitude = store.location?.coordinates?.[1];
      obj.longitude = store.location?.coordinates?.[0];
      return obj;
    });

    res.json(transformed);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error during store search." });
  }
};

module.exports = {
  addStore,
  searchStores,
  getStoreSuggestions,
};
