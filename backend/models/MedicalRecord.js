const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
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
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  visitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  chiefComplaint: {
    type: String,
    required: true,
    trim: true
  },
  symptoms: [String],
  diagnosis: {
    primary: {
      type: String,
      required: true
    },
    secondary: [String]
  },
  vitalSigns: {
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number
  },
  physicalExamination: {
    generalAppearance: String,
    cardiovascular: String,
    respiratory: String,
    gastrointestinal: String,
    neurological: String,
    musculoskeletal: String,
    skin: String,
    other: String
  },
  laboratoryResults: [{
    testName: String,
    result: String,
    normalRange: String,
    date: Date,
    lab: String
  }],
  imagingResults: [{
    type: String, // X-ray, MRI, CT, Ultrasound, etc.
    bodyPart: String,
    findings: String,
    date: Date,
    facility: String,
    images: [String] // URLs to image files
  }],
  treatment: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    procedures: [String],
    recommendations: [String]
  },
  // Optional dedicated prescription block (set by /:id/prescription route)
  prescription: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String,
      strength: String,
      form: String
    }],
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    prescribedAt: Date,
    notes: String,
  },
  followUpInstructions: String,
  nextVisitDate: Date,
  notes: String,
  attachments: [{
    fileName: String,
    filePath: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });
medicalRecordSchema.index({ visitDate: -1 });

// Populate references when querying
medicalRecordSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName email phone dateOfBirth'
  }).populate({
    path: 'doctor',
    select: 'specialization',
    populate: {
      path: 'user',
      select: 'firstName lastName'
    }
  }).populate({
    path: 'appointment',
    select: 'appointmentDate appointmentTime reason'
  });
  next();
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);

