// File: models/storeModel.js

const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: String,
  tags: [String],
  lat: Number,
  lng: Number,
});

module.exports = mongoose.model('Store', storeSchema);
