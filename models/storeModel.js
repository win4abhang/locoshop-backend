const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: { type: String},
  address: { type: String},
  phone: { type: String},
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

storeSchema.index({ location: "2dsphere" });
storeSchema.index({ name: "text", tags: "text" });

module.exports = mongoose.models.Store || mongoose.model("Store", storeSchema);
