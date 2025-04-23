const Store = require("../models/storeModel");
// ✅ Bulk Upload Stores Function
const bulkAddStores = async (req, res) => {
  try {
    const stores = req.body;

    if (!Array.isArray(stores) || stores.length === 0) {
      return res.status(400).json({ message: "Invalid store data array." });
    }

    const formattedStores = stores.map((store) => {
      const tagsArray = Array.isArray(store.tags)
        ? store.tags
        : String(store.tags || "").split(",").map((tag) => tag.trim());

      return {
        name: store.name,
        address: store.address,
        phone: store.phone,
        tags: tagsArray,
        location: {
          type: "Point",
          coordinates: [
            parseFloat(store.lng),
            parseFloat(store.lat),
          ],
        },
      };
    });

    await Store.insertMany(formattedStores);
    res.status(201).json({ message: "Bulk stores added successfully!" });
  } catch (error) {
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ message: "Bulk insert failed.", error: error.message });
  }
};

// ✅ Add Store Function
const addStore = async (req, res) => {
  try {
    const { name, address, phone, lat, lng, tags } = req.body;

    // Validation
    if (!name || !address || !phone || !lat || !lng || !tags || tags.length === 0) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Convert tags to array if it is a string
    const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());

    // Create store object
    const store = new Store({
      name,
      address,
      phone,
      tags: tagsArray,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
    });

    // Save the store to the database
    await store.save();
    res.status(201).json({ message: "Store added successfully!" });
  } catch (error) {
    console.error("Add Store Error:", error);
    res.status(500).json({ message: "Server error while adding store." });
  }
};

// ✅ Suggestion Function (Fuzzy Search for name and tags)
const getStoreSuggestions = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.json([]);
    }

    // Perform fuzzy search on name and tags (case-insensitive)
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

// ✅ Search Function with scoring and fallback (geo and relevance-based search)
const searchStores = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (!query || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Search query and location are required." });
    }

    const regex = new RegExp(query, "i");

    // Step 1: Get the 100 nearest stores based on geolocation
    const nearbyStores = await Store.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
        },
      },
    }).limit(100);

    // Step 2: Filter stores based on the search query (name or tags)
    let filtered = nearbyStores.filter((store) =>
      regex.test(store.name) || store.tags.some((tag) => regex.test(tag))
    );

    // Step 3: If no stores found, perform a global search
    if (filtered.length === 0) {
      const allStores = await Store.find({
        $or: [
          { name: { $regex: regex } },
          { tags: { $regex: regex } },
        ],
      }).limit(100);

      const scored = allStores.map((store) => {
        let score = 0;
        if (store.tags.some((tag) => regex.test(tag))) score += 2;
        if (regex.test(store.name)) score += 1;

        const [storeLng, storeLat] = store.location.coordinates;
        const dx = storeLat - lat;
        const dy = storeLng - lng;
        const distanceScore = -(dx * dx + dy * dy); // smaller = closer

        return { store, score, distanceScore };
      });

      // Sort stores by score, then distance
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.distanceScore - a.distanceScore;
      });

      filtered = scored.map((s) => s.store);
    }

    // Paginate the filtered results
    const paginated = filtered.slice(skip, skip + limit).map((store) => {
      const obj = store.toObject();
      obj.latitude = store.location?.coordinates?.[1];
      obj.longitude = store.location?.coordinates?.[0];
      return obj;
    });

    res.json(paginated);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error during store search." });
  }
};

// ✅ Autocomplete Function for name and tags (starts-with search)
const autocompleteStores = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query || query.length < 1) {
      return res.json([]);
    }

    // Match beginning of name or tags using ^ for "starts with"
    const regex = new RegExp("^" + query, "i");

    const stores = await Store.find({
      $or: [
        { name: { $regex: regex } },
        { tags: { $regex: regex } },
      ],
    }).limit(5);

    // Return only name + tags
    const suggestions = stores.map((store) => ({
      name: store.name,
      tags: store.tags,
    }));

    res.json(suggestions);
  } catch (err) {
    console.error("Autocomplete Error:", err);
    res.status(500).json({ error: "Server error during autocomplete." });
  }
};

module.exports = {
  addStore,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  bulkAddStores, // <-- Add this line
};
