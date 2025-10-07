const express = require('express');
const { body, validationResult } = require('express-validator');
const { MedicalRecord, Patient, Doctor, Appointment, Medicine } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/medical-records
// @desc    Get all medical records
// @access  Private
router.get('/', auth, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { patientId, doctorId, date } = req.query;

    let query = { isActive: true };
    
    if (patientId) query.patient = patientId;
    if (doctorId) query.doctor = doctorId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.visitDate = { $gte: startDate, $lt: endDate };
    }

    const medicalRecords = await MedicalRecord.find(query)
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicalRecord.countDocuments(query);

    res.json({
      success: true,
      data: medicalRecords,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medical-records/:id
// @desc    Get medical record by ID
// @access  Private
router.get('/:id', auth, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    res.json({
      success: true,
      data: medicalRecord
    });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medical-records/patient/:patientId
// @desc    Get all medical records for a patient
// @access  Private
router.get('/patient/:patientId', auth, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const medicalRecords = await MedicalRecord.find({ 
      patient: patientId, 
      isActive: true 
    })
      .sort({ visitDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicalRecord.countDocuments({ 
      patient: patientId, 
      isActive: true 
    });

    res.json({
      success: true,
      data: medicalRecords,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get patient medical records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/medical-records
// @desc    Create new medical record
// @access  Private
router.post('/', auth, authorize('admin', 'doctor'), [
  body('patient').isMongoId().withMessage('Valid patient ID is required'),
  body('doctor').isMongoId().withMessage('Valid doctor ID is required'),
  body('chiefComplaint').notEmpty().withMessage('Chief complaint is required'),
  body('diagnosis.primary').notEmpty().withMessage('Primary diagnosis is required'),
  body('visitDate').optional().isISO8601().withMessage('Valid visit date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const medicalRecordData = req.body;

    // Check if patient exists
    const patient = await Patient.findById(medicalRecordData.patient);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(medicalRecordData.doctor);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if appointment exists (if provided)
    if (medicalRecordData.appointment) {
      const appointment = await Appointment.findById(medicalRecordData.appointment);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
    }

    const medicalRecord = new MedicalRecord(medicalRecordData);
    await medicalRecord.save();

    res.status(201).json({
      success: true,
      data: medicalRecord,
      message: 'Medical record created successfully'
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/medical-records/:id
// @desc    Update medical record
// @access  Private
router.put('/:id', auth, authorize('admin', 'doctor'), [
  body('chiefComplaint').optional().notEmpty().withMessage('Chief complaint cannot be empty'),
  body('diagnosis.primary').optional().notEmpty().withMessage('Primary diagnosis cannot be empty'),
  body('visitDate').optional().isISO8601().withMessage('Valid visit date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const medicalRecord = await MedicalRecord.findById(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const updatedMedicalRecord = await MedicalRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedMedicalRecord,
      message: 'Medical record updated successfully'
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/medical-records/:id
// @desc    Delete medical record (soft delete)
// @access  Private
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const medicalRecord = await MedicalRecord.findById(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Soft delete - just deactivate
    await MedicalRecord.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({
      success: true,
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    console.error('Delete medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/medical-records/:id/prescription
// @desc    Add prescription to medical record
// @access  Private
router.post('/:id/prescription', auth, authorize('admin', 'doctor'), [
  body('medications').isArray().withMessage('Medications must be an array'),
  body('medications.*.name').notEmpty().withMessage('Medication name is required'),
  body('medications.*.dosage').notEmpty().withMessage('Medication dosage is required'),
  body('medications.*.frequency').notEmpty().withMessage('Medication frequency is required'),
  body('prescribedBy').isMongoId().withMessage('Valid doctor ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const medicalRecord = await MedicalRecord.findById(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const prescriptionData = { ...req.body, prescribedAt: new Date() };

    // Ensure medicines exist in master; create if missing
    const enrichedMeds = [];
    for (const med of prescriptionData.medications || []) {
      const query = { name: med.name };
      if (med.strength) query.strength = med.strength;
      if (med.form) query.form = med.form;
      let master = await Medicine.findOne(query);
      if (!master) {
        master = new Medicine({
          name: med.name,
          salt: med.salt || '',
          strength: med.strength || '',
          form: med.form || '',
          pendingPricing: true,
        });
        await master.save();
      }
      enrichedMeds.push({ ...med });
    }

    medicalRecord.prescription = { ...prescriptionData, medications: enrichedMeds };
    await medicalRecord.save();

    // If linked appointment exists, mark it completed
    if (medicalRecord.appointment) {
      try {
        await Appointment.findByIdAndUpdate(medicalRecord.appointment, { status: 'completed' });
      } catch (e) {
        console.warn('Failed to update appointment status to completed:', e?.message || e);
      }
    }

    res.json({
      success: true,
      data: medicalRecord,
      message: 'Prescription added successfully'
    });
  } catch (error) {
    console.error('Add prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

