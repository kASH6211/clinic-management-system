const express = require('express');
const { body, validationResult } = require('express-validator');
const { Patient } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients
// @access  Private
router.get('/', auth, authorize('admin', 'receptionist', 'doctor', 'chemist'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { regNo: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      data: patients,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', auth, authorize('admin', 'receptionist', 'doctor', 'chemist'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patients
// @desc    Create new patient
// @access  Private
router.post('/', auth, authorize('admin', 'receptionist'), [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('dateOfBirth').isISO8601().withMessage('Please provide a valid date of birth'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('address.street').optional(),
  body('address.city').optional(),
  body('address.state').optional(),
  body('address.zipCode').optional(),
  body('emergencyContact.name').optional(),
  body('emergencyContact.phone').optional(),
  body('emergencyContact.relationship').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patientData = req.body;

    // Remove email if it's empty string or null to prevent unique constraint error (sparse index)
    if (!patientData.email) {
      delete patientData.email;
    }

    // Check if patient already exists by email (when provided)
    if (patientData.email) {
      const existingPatient = await Patient.findOne({ email: patientData.email });
      if (existingPatient) {
        return res.status(400).json({ message: 'Patient already exists with this email' });
      }
    }

    // Auto-generate registration number with date prefix (YYYYMMDD) and 4-digit daily sequence
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `${yyyy}${mm}${dd}`;
    // Only generate if not provided
    if (!patientData.regNo) {
      // Find the highest existing suffix for today and increment
      const latest = await Patient.find({ regNo: { $regex: `^${prefix}\\d{4}$` } })
        .sort({ regNo: -1 })
        .limit(1);
      let nextSeq = 1;
      if (latest.length > 0) {
        const last = latest[0].regNo;
        const suffix = parseInt(last.slice(-4), 10);
        if (!isNaN(suffix)) nextSeq = suffix + 1;
      }
      patientData.regNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }

    const patient = new Patient(patientData);
    await patient.save();

    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient created successfully'
    });
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', auth, authorize('admin', 'receptionist'), [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  body('dateOfBirth').optional().isISO8601().withMessage('Please provide a valid date of birth'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if email is being changed and if it already exists
    if (req.body.email && req.body.email !== patient.email) {
      const existingPatient = await Patient.findOne({ email: req.body.email });
      if (existingPatient) {
        return res.status(400).json({ message: 'Patient already exists with this email' });
      }
    }

    // Remove email if it's empty string or null
    if (!req.body.email) {
      delete req.body.email;
      // If we want to explicitly clear the email, we might need $unset, 
      // but for now let's just avoid sending empty string which might be treated as value
      // If the intent is to clear it, we'd need more logic, but this fixes the "empty string causes dupe error"
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedPatient,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient
// @access  Private
router.delete('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    await Patient.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

