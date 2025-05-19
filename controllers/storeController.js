const Store = require('../models/storeModel'); // ✅ Use only once

const mongoose = require('mongoose');
const SmartTag = require('../models/SmartTag'); // ✅ new model

const { getSmartTag } = require('../utils/gptHelper');
const { normalizeQuery, isValidCoordinates, normalizeText } = require('../utils/searchHelpers');

const {
  findStoresByQuery,
  findSmartTag,
  saveSmartTag
} = require('../utils/searchFlow');


// Core search controller
const searchStores = async (req, res) => {
  const { latitude, longitude, row_query } = req.query;
  const limit = 100;
  const query = normalizeQuery(row_query);

  if (!latitude || !longitude || !query) {
    return res.status(400).json({ message: 'Missing coordinates or query' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (!isValidCoordinates(lat, lng)) {
    return res.status(400).json({ message: 'Invalid coordinates' });
  }

  try {
    // 🔍 1. Try direct match
    const { stores } = await findStoresByQuery(query, lat, lng, 0, limit);
    if (stores.length > 0) {
      return res.json({ stores });
    }

    // 🔄 2. Try existing SmartTag from DB
    const existingSmartTag = await findSmartTag(query);
    if (existingSmartTag) {
      const smartQuery = existingSmartTag.smartQuery;
      const { stores: smartStores } = await findStoresByQuery(smartQuery, lat, lng, 0, limit);
      if (smartStores.length > 0) {
        return res.json({ stores: smartStores });
      }
    }

    // 🤖 3. Call GPT if smart tag not found
    if (!existingSmartTag) {
      const gptSmartQuery = await getSmartTag(query);

      if (gptSmartQuery && gptSmartQuery !== query) {
        await saveSmartTag(query, gptSmartQuery);

        const { stores: gptStores } = await findStoresByQuery(gptSmartQuery, lat, lng, 0, limit);
        if (gptStores.length > 0) {
          return res.json({ stores: gptStores });
        }
      }
    }
    // ❌ No results
    res.json({ stores: [] });

  } catch (error) {
    console.error('searchStores error:', error);
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