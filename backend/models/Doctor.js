const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  qualifications: [String],
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    },
    tuesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    },
    wednesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    },
    thursday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    },
    friday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String
    }
  },
  maxPatientsPerDay: {
    type: Number,
    default: 20
  },
  bio: String,
  languages: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Populate user details when querying
doctorSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName email phone profileImage'
  });
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);

