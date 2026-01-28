const mongoose = require('mongoose');

const dispenseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  strength: String,
  form: String,
  duration: String,
  notes: String,
}, { _id: false });

const dispenseSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  appointmentDay: { type: Date },
  dailyToken: { type: Number },

  items: { type: [dispenseItemSchema], default: [] },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },

  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial', 'cancelled'], default: 'pending' },
  paidAmount: { type: Number, default: 0, min: 0 },
  billNumber: { type: String, unique: true, sparse: true },

  dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Index to quickly find by token/day
dispenseSchema.index({ appointmentDay: 1, dailyToken: 1 });

module.exports = mongoose.model('Dispense', dispenseSchema);
