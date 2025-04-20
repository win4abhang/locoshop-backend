const express = require("express");
const router = express.Router();
const Store = require("../models/Store");

// /api/stores/search?query=bike repair&lat=19.07&lng=72.87&page=1
router.get("/search", async (req, res) => {
  try {
    const { query, lat, lng, page = 1 } = req.query;

    if (!query || !lat || !lng) {
      return res.status(400).json({ message: "Missing query or location" });
    }

    const tags = query.toLowerCase().split(" ");
    const skip = (page - 1) * 3;

    const stores = await Store.find({
      tags: { $in: tags },
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 50000 // 50 km radius
        }
      }
    })
      .limit(3)
      .skip(skip);

    res.json(stores);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// === NEW ADD STORE ROUTE ===
router.post('/add', async (req, res) => {
  const { name, address, phone, lat, lng, tags } = req.body;

  if (!name || !address || !phone || !lat || !lng || !tags) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newStore = new Store({
      name,
      address,
      phone,
      tags: tags.split(',').map((tag) => tag.trim().toLowerCase()),
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      }
    });

    await newStore.save();
    res.status(201).json({ message: 'Store added successfully' });
  } catch (error) {
    console.error("Add Store Error:", error);
    res.status(500).json({ message: 'Failed to add store' });
  }
});

module.exports = router;
