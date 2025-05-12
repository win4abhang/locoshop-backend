const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  tags: [{ type: String }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
}, { timestamps: true });

storeSchema.index({ location: "2dsphere" }); // already likely present
storeSchema.index({ name: "text", tags: "text" }); // for efficient text search

module.exports = mongoose.model("Store", storeSchema);
