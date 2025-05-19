const mongoose = require('mongoose');

const smartTagSchema = new mongoose.Schema({
  originalQuery: { type: String, required: true, unique: true },
  smartQuery: { type: String, required: true },
});

module.exports = mongoose.model('SmartTag', smartTagSchema);
