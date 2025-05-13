const Store = require('../models/storeModel');
const { expandQueryTerms } = require('../utils/searchHelpers');

// Normalize text for consistent matching
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
    .trim();
};

// Core search controller
const searchStores = async (req, res) => {
  const { lat, lon, query, page = 1 } = req.query;
  const limit = 3;
  const skip = (page - 1) * limit;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'Latitude and longitude are required' });
  }

  let searchTerms = [];
  if (query) {
    const normalized = normalizeText(query);
    searchTerms = expandQueryTerms(normalized);
  }

  try {
    let matchStage = {};
    if (searchTerms.length > 0) {
      matchStage = {
        $or: searchTerms.map(term => ({
          $or: [
            { name: { $regex: term, $options: 'i' } },
            { tags: { $regex: term, $options: 'i' } }
          ]
        }))
      };
    }

    const stores = await Store.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] },
          distanceField: 'distance',
          spherical: true,
          query: matchStage
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    if (stores.length > 0) {
      const totalCount = await Store.countDocuments(matchStage);
      return res.json({
        stores,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: skip + stores.length < totalCount
      });
    }

    // Fallback local scoring if no geoNear matches
    const allStores = await Store.find();
    const regexList = searchTerms.map(term => new RegExp(term, 'i'));
    const scoredStores = allStores.map(store => {
      let score = 0;
      for (const regex of regexList) {
        if (regex.test(store.name)) score += 2;
        if (store.tags.some(tag => regex.test(tag))) score += 1;
      }

      const distance = Math.sqrt(
        Math.pow(store.location.coordinates[1] - parseFloat(lat), 2) +
        Math.pow(store.location.coordinates[0] - parseFloat(lon), 2)
      );
      return { ...store.toObject(), score, distance };
    });

    const filtered = scoredStores
      .filter(store => store.score > 0)
      .sort((a, b) => b.score - a.score || a.distance - b.distance);

    const paginated = filtered.slice(skip, skip + limit);
    res.json({
      stores: paginated,
      currentPage: parseInt(page),
      totalPages: Math.ceil(filtered.length / limit),
      hasNextPage: skip + paginated.length < filtered.length
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Autocomplete endpoint for search suggestions
const autocompleteStores = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: 'Query is required' });

  try {
    const regex = new RegExp(query, 'i');
    const stores = await Store.find({
      $or: [{ name: regex }, { tags: regex }]
    }).limit(10).select('name tags');

    res.json(stores);
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Returns basic suggestions
const getStoreSuggestions = async (req, res) => {
  try {
    const stores = await Store.find().limit(10).select('name tags');
    res.json(stores);
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add a single store
const addStore = async (req, res) => {
  const { name, phone, tags, location } = req.body;
  if (!name || !phone || !tags || !location) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const newStore = new Store({ name, phone, tags, location });
    await newStore.save();
    res.status(201).json(newStore);
  } catch (error) {
    console.error('Add store error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk add stores
const bulkAddStores = async (req, res) => {
  try {
    const stores = req.body;
    await Store.insertMany(stores);
    res.status(201).json({ message: 'Stores added successfully' });
  } catch (error) {
    console.error('Bulk add error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all stores
const getAllStoresForAdmin = async (req, res) => {
  try {
    const stores = await Store.find();
    res.json(stores);
  } catch (error) {
    console.error('Fetch all error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update store by ID
const updateStoreById = async (req, res) => {
  try {
    const updated = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Store not found' });
    res.json(updated);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete store by ID
const deleteStoreById = async (req, res) => {
  try {
    const deleted = await Store.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete all stores (admin-only)
const deleteAllStores = async (req, res) => {
  try {
    await Store.deleteMany();
    res.json({ message: 'All stores deleted successfully' });
  } catch (error) {
    console.error('Delete all error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  searchStores,
  autocompleteStores,
  getStoreSuggestions,
  addStore,
  bulkAddStores,
  getAllStoresForAdmin,
  updateStoreById,
  deleteStoreById,
  deleteAllStores
};
