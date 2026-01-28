const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  salt: { type: String, trim: true },
  strength: { type: String, trim: true }, // e.g., 500mg
  form: { type: String, trim: true }, // e.g., tablet, syrup
  costPrice: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 0, min: 0 },
  pendingPricing: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

medicineSchema.index({ name: 1, strength: 1, form: 1 }, { unique: true });
medicineSchema.index({ salt: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
