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

module.exports = router;
