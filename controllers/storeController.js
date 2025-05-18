const Store = require('../models/storeModel');
const { expandQueryTerms } = require('../utils/searchHelpers');
const { getSmartTag } = require('../utils/gptHelper');

const smartTagCache = {};
const smartTagFetchPromises = {}; // Tracks ongoing fetches

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
  const { latitude, longitude, query, page} = req.query;
  const limit = 3;
  const skip = (page - 1) * limit;

  if (!latitude || !longitude) {
    return res.status(400).json({});
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (!isValidCoordinates(lat, lng)) {
    return res.status(400).json({ message: 'Invalid latitude or longitude' });
  }

  let searchTerms = [];
  searchTerms = [query];  
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
          near: { type: 'Point', coordinates: [lng, lat] },
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

    // Fallback: manual match
    const regexList = searchTerms.map(term => new RegExp(term, 'i'));

    // Step 1: Filter only relevant stores using $or with regex (prevents loading all stores)
    const fallbackStores = await Store.find({
      $or: searchTerms.map(term => ({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { tags: { $regex: term, $options: 'i' } }
        ]
      }))
    });
    
    // Step 2: Score and calculate distance manually
    const scoredStores = fallbackStores.map(store => {
      let score = 0;
    
      for (const regex of regexList) {
        if (regex.test(store.name)) score += 2;
        if (store.tags.some(tag => regex.test(tag))) score += 1;
      }
    
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



// Admin UI


// Add a single store
const addStore = async (req, res) => {
  const { name, address, phone, tags, location } = req.body;

  // Basic presence check
  if (!name || !address || !phone || !tags || !location) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Location structure validation
  if (
    typeof location !== 'object' ||
    location.type !== 'Point' ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2 ||
    isNaN(location.coordinates[0]) ||
    isNaN(location.coordinates[1])
  ) {
    return res.status(400).json({ message: 'Invalid location format' });
  }

  try {
    const newStore = new Store({
      name,
      address,
      phone,
      tags,
      location
    });

    const savedStore = await newStore.save();
    res.status(201).json(savedStore);
  } catch (error) {
    console.error('Error saving store:', error);

    // Handle validation error specifically
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: error.errors });
    }

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

const updateStoreById = async (req, res) => {
  const { id } = req.params;

  // 1. Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid store ID' });
  }

  // 2. Optional: Validate `location` structure if present in update
  if (req.body.location) {
    const loc = req.body.location;
    if (
      typeof loc !== 'object' ||
      loc.type !== 'Point' ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length !== 2 ||
      isNaN(loc.coordinates[0]) ||
      isNaN(loc.coordinates[1])
    ) {
      return res.status(400).json({ message: 'Invalid location format' });
    }
  }

  try {
    const updated = await Store.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true, // enforce schema validation
    });

    if (!updated) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error in updateStoreById:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: error.errors });
    }

    res.status(500).json({ message: 'Server error' });
  }
};
// Get store by name
const getStoresByName = async (req, res) => {
  const { name } = req.params;

  if (!name) {
    return res.status(400).json({ message: 'Name parameter is required' });
  }

  try {
    // Use case-insensitive regex to match name partially
    const stores = await Store.find({
      name: { $regex: name, $options: 'i' },
    });

    res.json({ stores });
  } catch (error) {
    console.error('Error in getStoresByName:', error);
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
  deleteAllStores,
  getStoresByName
};