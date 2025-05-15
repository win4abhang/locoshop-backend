const Store = require('../models/storeModel');
const { expandQueryTerms } = require('../utils/searchHelpers');
const { getSmartTag } = require('../utils/gptHelper');

// Normalize text for consistent matching
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove punctuation
    .trim();
};

// Validate latitude and longitude
const isValidCoordinates = (lat, lng) => {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Core search controller
const searchStores = async (req, res) => {
  const { latitude, longitude, query, page = 1 } = req.query;
  const limit = 3;
  const skip = (page - 1) * limit;

  if (!latitude || !longitude) {
    return res.status(400).json({ 
      //message: `Latitude and longitude are required. Received latitude: ${latitude}, longitude: ${longitude}` 
    });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (!isValidCoordinates(lat, lng)) {
    return res.status(400).json({ message: 'Invalid latitude or longitude' });
  }

  let searchTerms = [];
  if (query) {
    const smartTag = await getSmartTag(query);
    console.log(`GTP smartTag for "${query}":`, smartTag); // ✅ Debug line
    searchTerms = [smartTag];
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

    // Ensure the matchStage is used correctly in the geo query
    const stores = await Store.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          spherical: true,
          query: matchStage // Ensure the matchStage is here for text matching
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

    // Fallback search: local search by name and tags without geo
    const allStores = await Store.find();
    const regexList = searchTerms.map(term => new RegExp(term, 'i'));

    const scoredStores = allStores.map(store => {
      let score = 0;
      for (const regex of regexList) {
        if (regex.test(store.name)) score += 2;  // Higher score for name match
        if (store.tags.some(tag => regex.test(tag))) score += 1;  // Medium score for tag match
      }

      // Calculate distance manually (non-geo search)
      const distance = Math.sqrt(
        Math.pow(store.location.coordinates[1] - lat, 2) +
        Math.pow(store.location.coordinates[0] - lng, 2)
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
    console.error('Error in searchStores:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Autocomplete endpoint
const autocompleteStores = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ message: 'Query is required' });

  try {
    const normalizedQuery = normalizeText(query);
    const regex = new RegExp(normalizedQuery, 'i');
    const stores = await Store.find({
      $or: [{ name: regex }, { tags: regex }]
    }).limit(10).select('name tags');

    res.json(stores);
  } catch (error) {
    console.error('Error in autocompleteStores:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get default suggestions
const getStoreSuggestions = async (req, res) => {
  try {
    const stores = await Store.find().limit(10).select('name tags');
    res.json(stores);
  } catch (error) {
    console.error('Error in getStoreSuggestions:', error);
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
    console.error('Error in addStore:', error);
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
    console.error('Error in bulkAddStores:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all stores
const getAllStoresForAdmin = async (req, res) => {
  try {
    const stores = await Store.find();
    res.json(stores);
  } catch (error) {
    console.error('Error in getAllStoresForAdmin:', error);
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
    console.error('Error in updateStoreById:', error);
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
    console.error('Error in deleteStoreById:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete all stores
const deleteAllStores = async (req, res) => {
  try {
    await Store.deleteMany();
    res.json({ message: 'All stores deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAllStores:', error);
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