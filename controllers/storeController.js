const Store = require("../models/storeModel");

// Add a single store
const addStore = async (req, res) => {
  try {
    const { name, address, phone, lat, lng, tags } = req.body;
    if (!name || !address || !phone || !lat || !lng || !tags) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    const store = new Store({
      name,
      address,
      phone,
      tags: tagsArray,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    });

    await store.save();
    res.status(201).json({ message: "Store added successfully!" });
  } catch (error) {
    console.error("Add Store Error:", error);
    res.status(500).json({ message: "Error adding store", error: error.message });
  }
};

// Bulk insert
const bulkAddStores = async (req, res) => {
  try {
    const stores = req.body;
    if (!Array.isArray(stores) || stores.length === 0) {
      return res.status(400).json({ message: "Invalid store data array." });
    }

    const formattedStores = stores.map((store, index) => {
      const lat = parseFloat(store.lat);
      const lng = parseFloat(store.lng);
      const tagsArray = Array.isArray(store.tags)
        ? store.tags
        : String(store.tags || "general").split(",").map(tag => tag.trim());

      return {
        name: store.name?.trim() || `Dummy Store ${index + 1}`,
        address: store.address?.trim() || "No address",
        phone: store.phone?.trim() || `99999${index}`,
        tags: tagsArray,
        location: { type: "Point", coordinates: [lng, lat] },
      };
    }).filter(store => !store.error);

    if (formattedStores.length === 0) {
      return res.status(400).json({ message: "No valid stores to insert." });
    }

    await Store.insertMany(formattedStores, { ordered: false });
    res.status(201).json({ message: "Bulk stores added successfully!" });
  } catch (error) {
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ message: "Bulk insert failed", error: error.message });
  }
};

// ✅ Admin list stores (paginated)
const getAllStoresForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const stores = await Store.find().skip(skip).limit(limit);
    const totalStores = await Store.countDocuments();
    const totalPages = Math.ceil(totalStores / limit);

    res.json({ stores, page, totalPages, totalStores });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ User search with location & relevance
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

    const nearbyStores = await Store.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
        },
      },
    }).limit(50);

    let filtered = nearbyStores.filter(store =>
      regex.test(store.name) || store.tags.some(tag => regex.test(tag))
    );

    if (filtered.length === 0) {
      const allStores = await Store.find({
        $or: [
          { name: { $regex: regex } },
          { tags: { $elemMatch: { $regex: regex } } },
        ],
      }).limit(50);

      const scored = allStores.map(store => {
        let score = 0;
        if (store.tags.some(tag => regex.test(tag))) score += 2;
        if (regex.test(store.name)) score += 1;

        const [storeLng, storeLat] = store.location.coordinates;
        const dx = storeLat - lat;
        const dy = storeLng - lng;
        const distanceScore = -(dx * dx + dy * dy);

        return { store, score, distanceScore };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.distanceScore - a.distanceScore;
      });

      filtered = scored.map(s => s.store);
    }

    const paginated = filtered.slice(skip, skip + limit).map(store => {
      const obj = store.toObject();
      obj.latitude = store.location.coordinates[1];
      obj.longitude = store.location.coordinates[0];
      return obj;
    });

    res.json({
      stores: paginated,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      totalStores: filtered.length
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error during store search." });
  }
};

// Other utilities
const getStoreSuggestions = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json([]);
    const stores = await Store.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
      ],
    }).limit(5);
    res.json(stores.map(store => ({
      ...store.toObject(),
      latitude: store.location.coordinates[1],
      longitude: store.location.coordinates[0]
    })));
  } catch (err) {
    res.status(500).json({ error: "Error fetching suggestions." });
  }
};

const autocompleteStores = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) return res.json([]);
    const regex = new RegExp("^" + query, "i");
    const stores = await Store.find({
      $or: [
        { name: { $regex: regex } },
        { tags: { $regex: regex } },
      ],
    }).limit(5);
    res.json(stores.map(store => ({
      name: store.name,
      tags: store.tags,
    })));
  } catch (err) {
    res.status(500).json({ error: "Error during autocomplete." });
  }
};

const getStoreByName = async (req, res) => {
  try {
    const stores = await Store.find({ name: req.params.name });
    if (stores.length === 0) return res.status(404).json({ message: 'Store not found' });
    res.json({ stores });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    if (update.lat && update.lng) {
      update.location = {
        type: 'Point',
        coordinates: [parseFloat(update.lng), parseFloat(update.lat)],
      };
    }

    if (typeof update.tags === 'string') {
      update.tags = update.tags.split(',').map(t => t.trim());
    }

    const store = await Store.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: 'Store updated', store });
  } catch (error) {
    res.status(500).json({ message: 'Error updating store.' });
  }
};

const deleteStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Store.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Store not found' });
    res.status(200).json({ message: 'Store deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete store' });
  }
};

module.exports = {
  addStore,
  bulkAddStores,
  searchStores,
  getStoreSuggestions,
  autocompleteStores,
  getStoreByName,
  updateStoreById,
  deleteStoreById,
  getAllStoresForAdmin,
};
