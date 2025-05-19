const SmartTag = require('../models/SmartTag');
const Store = require('../models/storeModel'); // ✅ Use only once
const { getSmartTag } = require('./gptHelper');

// Search stores using a query and location
async function findStoresByQuery(query, lat, lng, skip = 0, limit = 100) {
    const result = await Store.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          spherical: true,
          query: {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { tags: { $regex: query, $options: 'i' } }
            ]
          }
        }
      },
      { $limit: limit }
    ]);
  
    // Note: We're skipping totalCount since it's not needed anymore.
    return { stores: result };
  }


// Save GPT result to SmartTag DB
async function saveSmartTag(originalQuery, smartQuery) {
  if (originalQuery !== smartQuery) {
    await SmartTag.create({ originalQuery, smartQuery });
  }
}

// Try searching with smartQuery from DB
async function findSmartTag(query) {
    try {
      return await SmartTag.findOne({ originalQuery: query });
    } catch (error) {
      console.error('Error finding SmartTag:', error);
      return null;
    }
  }

module.exports = {
  findStoresByQuery,
  findSmartTag,
  saveSmartTag,
};
