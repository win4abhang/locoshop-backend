const mongoose = require('mongoose');
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const stores = req.body;
    if (!Array.isArray(stores) || stores.length === 0) {
      await session.abortTransaction();
      session.endSession();
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
        phone: store.phone?.trim() || ``,
        tags: tagsArray,
        location: { type: "Point", coordinates: [lng, lat] },
      };
    });

    // Insert all stores within the transaction
    await Store.insertMany(formattedStores, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Bulk stores added successfully!" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Bulk Upload Error:", error);
    res.status(500).json({ message: "Bulk insert failed", error: error.message });
  }
};
// ✅ Admin list stores (paginated)
const getAllStoresForAdmin = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const totalCount = await Store.countDocuments({});
  const stores = await Store.find().skip(skip).limit(limit);

  res.json({ stores, totalCount });
};
// ✅ User search with location & relevance
const searchStores = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;

    if (!query || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Search query and location are required." });
    }

    const regex = new RegExp(query, "i");

    // Step 1: Nearby + Matching by name/tags
    const primaryResults = await Store.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          spherical: true,
          query: {
            $or: [
              { name: { $regex: regex } },
              { tags: { $elemMatch: { $regex: regex } } },
            ]
          }
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    if (primaryResults.length > 0) {
      const stores = primaryResults.map(store => ({
        ...store,
        latitude: store.location.coordinates[1],
        longitude: store.location.coordinates[0],
      }));
      return res.json({
        stores,
        page,
        totalStores: "Nearby matches only"
      });
    }

    // Step 2: Fallback – relevance match only, scored
    const fallbackStores = await Store.find({
      $or: [
        { name: { $regex: regex } },
        { tags: { $elemMatch: { $regex: regex } } }
      ]
    });

    // Score + distance calculation
    const enriched = fallbackStores.map(store => {
      let score = 0;
      if (store.name.match(regex)) score += 2;
      if (store.tags.some(tag => tag.match(regex))) score += 1;

      const [lng2, lat2] = store.location.coordinates;
      const distanceSq = Math.pow(lat - lat2, 2) + Math.pow(lng - lng2, 2);

      return {
        store,
        score,
        distanceSq
      };
    });

    enriched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.distanceSq - b.distanceSq;
    });

    const paginated = enriched.slice(skip, skip + limit).map(item => {
      const s = item.store.toObject();
      return {
        ...s,
        latitude: s.location.coordinates[1],
        longitude: s.location.coordinates[0],
        score: item.score
      };
    });

    return res.json({
      stores: paginated,
      page,
      totalStores: enriched.length
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error during search." });
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

// Delete all stores
const deleteAllStores = async (req, res) => {
  try {
    await Store.deleteMany({});
    res.status(200).json({ message: 'All stores deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  deleteAllStores, 
};
