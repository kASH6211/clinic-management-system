const express = require('express');
const { body, validationResult } = require('express-validator');
const { Medicine } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/medicines
// @desc    List/search medicines
// @access  Private (admin, chemist, doctor)
router.get('/', auth, authorize('admin', 'chemist', 'doctor'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, salt, form, active } = req.query;

    const query = {};
    if (typeof active !== 'undefined') query.isActive = active === 'true';
    if (salt) query.salt = new RegExp(salt, 'i');
    if (form) query.form = new RegExp(form, 'i');
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ name: re }, { salt: re }];
    }

    const items = await Medicine.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);
    const total = await Medicine.countDocuments(query);

    res.json({ success: true, data: items, pagination: { current: page, pages: Math.ceil(total / limit), total } });
  } catch (err) {
    console.error('List medicines error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medicines/:id
// @desc    Get a medicine
// @access  Private (admin, chemist, doctor)
router.get('/:id', auth, authorize('admin', 'chemist', 'doctor'), async (req, res) => {
  try {
    const med = await Medicine.findById(req.params.id);
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ success: true, data: med });
  } catch (err) {
    console.error('Get medicine error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/medicines
// @desc    Create medicine
// @access  Private (admin, chemist)
router.post('/', auth, authorize('admin', 'chemist'), [
  body('name').notEmpty(),
  body('costPrice').optional().isNumeric(),
  body('costPrice').optional().isNumeric(),
  body('sellingPrice').optional().isNumeric(),
  body('stock').optional().isNumeric(),
  body('minStock').optional().isNumeric(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const med = new Medicine(req.body);
    await med.save();
    res.status(201).json({ success: true, data: med, message: 'Medicine created' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Medicine already exists' });
    console.error('Create medicine error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/medicines/:id
// @desc    Update medicine
// @access  Private (admin, chemist)
router.put('/:id', auth, authorize('admin', 'chemist'), [
  body('costPrice').optional().isNumeric(),
  body('costPrice').optional().isNumeric(),
  body('sellingPrice').optional().isNumeric(),
  body('stock').optional().isNumeric(),
  body('minStock').optional().isNumeric(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!med) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ success: true, data: med, message: 'Medicine updated' });
  } catch (err) {
    console.error('Update medicine error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
