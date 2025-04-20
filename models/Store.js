const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({
  name: String,
  address: String,
  phone: String,
  whatsapp: String,
  tags: [String], // e.g. ["bike", "repair", "garage"]
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  }
});

storeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Store", storeSchema);
