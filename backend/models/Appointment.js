const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  // Date truncated to 00:00:00 for per-day grouping
  appointmentDay: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  // Token that starts from 1 for each appointmentDay
  dailyToken: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 30, // in minutes
    min: 15,
    max: 120
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'prescription dispensed'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'routine-checkup', 'vaccination'],
    default: 'consultation'
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  notes: String,
  prescription: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    notes: String,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    prescribedAt: Date
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'cancelled'],
    default: 'pending'
  },
  amount: {
    type: Number,
    min: 0
  },
  discount: { type: Number, min: 0, default: 0 },
  paymentOnline: { type: Number, min: 0, default: 0 },
  paymentOffline: { type: Number, min: 0, default: 0 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
// Ensure unique token per day
appointmentSchema.index({ appointmentDay: 1, dailyToken: 1 }, { unique: true });

// Populate references when querying
appointmentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName email phone regNo'
  }).populate({
    path: 'doctor',
    select: 'specialization consultationFee',
    populate: {
      path: 'user',
      select: 'firstName lastName'
    }
  });
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);

