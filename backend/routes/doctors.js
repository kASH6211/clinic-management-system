const express = require('express');
const { body, validationResult } = require('express-validator');
const { Doctor, User } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/doctors
// @desc    Get all doctors
// @access  Private
router.get('/', auth, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const specialization = req.query.specialization || '';

    let query = { isActive: true };
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    const doctors = await Doctor.find(query)
      .populate('user', 'firstName lastName email phone profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      data: doctors,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Private
router.get('/:id', auth, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', 'firstName lastName email phone profileImage address emergencyContact');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Get doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/doctors
// @desc    Create new doctor
// @access  Private
router.post('/', auth, authorize('admin'), [
  body('userData.firstName').notEmpty().withMessage('First name is required'),
  body('userData.lastName').notEmpty().withMessage('Last name is required'),
  body('userData.email').isEmail().withMessage('Please provide a valid email'),
  body('userData.password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userData.phone').notEmpty().withMessage('Phone number is required'),
  body('specialization').notEmpty().withMessage('Specialization is required'),
  body('licenseNumber').notEmpty().withMessage('License number is required'),
  body('experience').isNumeric().withMessage('Experience must be a number'),
  body('consultationFee').isNumeric().withMessage('Consultation fee must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userData, ...doctorData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if license number already exists
    const existingDoctor = await Doctor.findOne({ licenseNumber: doctorData.licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor already exists with this license number' });
    }

    // Create user first
    const user = new User({
      ...userData,
      role: 'doctor'
    });
    await user.save();

    // Create doctor
    const doctor = new Doctor({
      ...doctorData,
      user: user._id
    });
    await doctor.save();

    // Populate user data
    await doctor.populate('user', 'firstName lastName email phone profileImage');

    res.status(201).json({
      success: true,
      data: doctor,
      message: 'Doctor created successfully'
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/doctors/:id
// @desc    Update doctor
// @access  Private
router.put('/:id', auth, authorize('admin'), [
  body('specialization').optional().notEmpty().withMessage('Specialization cannot be empty'),
  body('licenseNumber').optional().notEmpty().withMessage('License number cannot be empty'),
  body('experience').optional().isNumeric().withMessage('Experience must be a number'),
  body('consultationFee').optional().isNumeric().withMessage('Consultation fee must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if license number is being changed and if it already exists
    if (req.body.licenseNumber && req.body.licenseNumber !== doctor.licenseNumber) {
      const existingDoctor = await Doctor.findOne({ licenseNumber: req.body.licenseNumber });
      if (existingDoctor) {
        return res.status(400).json({ message: 'Doctor already exists with this license number' });
      }
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone profileImage');

    res.json({
      success: true,
      data: updatedDoctor,
      message: 'Doctor updated successfully'
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/doctors/:id
// @desc    Delete doctor
// @access  Private
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Soft delete - just deactivate
    await Doctor.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({
      success: true,
      message: 'Doctor deactivated successfully'
    });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/specializations/list
// @desc    Get all specializations
// @access  Private
router.get('/specializations/list', auth, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const specializations = await Doctor.distinct('specialization', { isActive: true });
    
    res.json({
      success: true,
      data: specializations
    });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

