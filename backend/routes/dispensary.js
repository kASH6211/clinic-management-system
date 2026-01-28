const express = require('express');
const { body, validationResult } = require('express-validator');
const { Dispense, Appointment, Patient, MedicalRecord, Medicine } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Helpers
const computeTotals = (items = [], tax = 0, discount = 0) => {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0);
  const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0));
  return { subtotal, total };
};

// @route   GET /api/dispensary/dispenses
// @desc    Get dispense records by patientId OR by date+token
// @access  Private (chemist, admin, receptionist)
router.get('/dispenses', auth, authorize('chemist', 'admin', 'receptionist'), async (req, res) => {
  try {
    const { patientId, date, token } = req.query;

    let query = {};
    if (patientId) {
      query.patient = patientId;
    }
    if (date && token) {
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      query.appointmentDay = day;
      query.dailyToken = Number(token);
    }

    if (!patientId && !(date && token) && !req.query.startDate) {
      // Allow if separate reports mode (startDate present)
      // or if just wanting list? Let's check permissions.
      // Actually, if query params are empty, return 400? 
      // User might want "all recent". Let's allow startDate/endDate.
      // If no params, default to today? No, let frontend drive.
    }

    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.query.endDate || req.query.startDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (!patientId && !(date && token)) {
      return res.status(400).json({ message: 'Provide patientId, (date and token), or date range' });
    }

    const dispenses = await Dispense.find(query)
      .populate('patient', 'firstName lastName email phone')
      .populate({ path: 'appointment', select: 'appointmentDate appointmentTime dailyToken appointmentDay' })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: dispenses });
  } catch (error) {
    console.error('Get dispenses error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/dispensary/stats
// @desc    Get dispensary financial stats
// @access  Private (chemist, admin)
router.get('/stats', auth, authorize('chemist', 'admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date(startDate || new Date());
    end.setHours(23, 59, 59, 999);

    const stats = await Dispense.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$total' },
          totalCollected: { $sum: '$paidAmount' },
          count: { $sum: 1 },
          totalPending: {
            $sum: {
              $cond: [{ $gt: ['$total', '$paidAmount'] }, { $subtract: ['$total', '$paidAmount'] }, 0]
            }
          },
          totalRefunds: {
            $sum: {
              $cond: [{ $gt: ['$paidAmount', '$total'] }, { $subtract: ['$paidAmount', '$total'] }, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { totalBilled: 0, totalCollected: 0, count: 0, totalPending: 0, totalRefunds: 0 };
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/dispensary/dispenses/:id
// @desc    Get dispense by ID
// @access  Private (chemist, admin, receptionist)
router.get('/dispenses/:id', auth, authorize('chemist', 'admin', 'receptionist'), async (req, res) => {
  try {
    const d = await Dispense.findById(req.params.id)
      .populate('patient', 'firstName lastName email phone')
      .populate({ path: 'appointment', select: 'appointmentDate appointmentTime dailyToken appointmentDay' });
    if (!d) return res.status(404).json({ message: 'Dispense record not found' });
    res.json({ success: true, data: d });
  } catch (error) {
    console.error('Get dispense error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/dispensary/dispenses
// @desc    Create a dispense record (by token/day or patientId)
// @access  Private (chemist, admin)
router.post('/dispenses', auth, authorize('chemist', 'admin'), [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isNumeric().withMessage('Item quantity must be a number'),
  body('items.*.unitPrice').isNumeric().withMessage('Item unitPrice must be a number'),
  body('tax').optional().isNumeric(),
  body('discount').optional().isNumeric(),
  body('patient').optional().isMongoId(),
  body('date').optional().isISO8601(),
  body('token').optional().isNumeric(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, tax = 0, discount = 0, patient: patientId, date, token } = req.body;

    let patient = null;
    let appointmentRef = null;
    let appointmentDay = null;
    let dailyToken = null;

    if (date && token) {
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      appointmentDay = day;
      dailyToken = Number(token);
      appointmentRef = await Appointment.findOne({ appointmentDay: day, dailyToken });
      if (!appointmentRef) return res.status(404).json({ message: 'No appointment found for given token and date' });
      patient = await Patient.findById(appointmentRef.patient);
      if (!patient) return res.status(404).json({ message: 'Patient not found from appointment' });
    } else if (patientId) {
      patient = await Patient.findById(patientId);
      if (!patient) return res.status(404).json({ message: 'Patient not found' });
    } else {
      return res.status(400).json({ message: 'Provide (date and token) or patient' });
    }

    const { subtotal, total } = computeTotals(items, tax, discount);

    // Simple bill number: YYYYMMDD-<timestamp>-<rand>
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const billNumber = `${y}${m}${day}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(-5)}`;

    const dispense = new Dispense({
      patient: patient._id,
      appointment: appointmentRef?._id,
      appointmentDay,
      dailyToken,
      items,
      subtotal,
      tax,
      discount,
      total,
      paymentStatus: 'pending',
      paidAmount: 0,
      billNumber,
      dispensedBy: req.user.id,
    });

    await dispense.save();

    // Decrement stock for matched medicines
    try {
      for (const it of items) {
        let med = null;
        if (it.name && (it.strength || it.form)) {
          med = await Medicine.findOne({ name: it.name, strength: it.strength || '', form: it.form || '' });
        }
        if (!med) {
          med = await Medicine.findOne({ name: it.name });
        }
        if (med) {
          med.stock = Math.max(0, Number(med.stock || 0) - Number(it.quantity || 0));
          await med.save();
        }
      }
    } catch (e) {
      console.warn('Stock decrement failed:', e?.message || e);
    }

    // Mark appointment as prescription dispensed
    if (appointmentRef?._id) {
      try {
        await Appointment.findByIdAndUpdate(appointmentRef._id, { status: 'prescription dispensed' });
      } catch (e) {
        console.warn('Failed updating appointment to prescription dispensed:', e?.message || e);
      }
    }

    res.status(201).json({ success: true, data: dispense, message: 'Dispense created successfully' });
  } catch (error) {
    console.error('Create dispense error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   PUT /api/dispensary/dispenses/:id
// @desc    Update dispense items/totals and adjust stock
// @access  Private (chemist, admin)
router.put('/dispenses/:id', auth, authorize('chemist', 'admin'), [
  body('items').optional().isArray({ min: 1 }),
  body('tax').optional().isNumeric(),
  body('discount').optional().isNumeric(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const d = await Dispense.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Dispense record not found' });
    if (d.paymentStatus === 'cancelled') return res.status(400).json({ message: 'Cannot update cancelled dispense' });

    const oldItems = d.items || [];
    const newItems = req.body.items ?? d.items;
    const tax = req.body.tax ?? d.tax;
    const discount = req.body.discount ?? d.discount;
    const { subtotal, total } = computeTotals(newItems, tax, discount);

    // Stock Adjustment Logic
    // 1. Revert old items (add back to stock)
    // 2. Deduct new items (remove from stock)
    // Optimization: Calculate net difference per medicine? 
    // Simpler approach: Add back all old, then subtract all new.
    try {
      // Revert old
      for (const it of oldItems) {
        let med = await Medicine.findOne({ name: it.name, strength: it.strength || '', form: it.form || '' });
        if (!med) med = await Medicine.findOne({ name: it.name });
        if (med) {
          med.stock = Number(med.stock || 0) + Number(it.quantity || 0);
          await med.save();
        }
      }
      // Deduct new
      for (const it of newItems) {
        let med = await Medicine.findOne({ name: it.name, strength: it.strength || '', form: it.form || '' });
        if (!med) med = await Medicine.findOne({ name: it.name });
        if (med) {
          med.stock = Math.max(0, Number(med.stock || 0) - Number(it.quantity || 0));
          await med.save();
        }
      }
    } catch (e) {
      console.warn('Stock adjustment failed during update:', e);
    }

    d.items = newItems;
    d.tax = tax;
    d.discount = discount;
    d.subtotal = subtotal;
    d.total = total;

    // Re-evaluate payment status
    if (d.paidAmount >= d.total) {
      d.paymentStatus = 'paid';
    } else if (d.paidAmount > 0) {
      d.paymentStatus = 'partial';
    } else {
      d.paymentStatus = 'pending';
    }

    await d.save();

    res.json({ success: true, data: d, message: 'Dispense updated successfully' });
  } catch (error) {
    console.error('Update dispense error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/dispensary/dispenses/:id/cancel
// @desc    Cancel dispense and restore stock
// @access  Private (chemist, admin)
router.post('/dispenses/:id/cancel', auth, authorize('chemist', 'admin'), async (req, res) => {
  try {
    const d = await Dispense.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Dispense record not found' });
    if (d.paymentStatus === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    // Restore stock
    try {
      for (const it of d.items) {
        let med = await Medicine.findOne({ name: it.name, strength: it.strength || '', form: it.form || '' });
        if (!med) med = await Medicine.findOne({ name: it.name });
        if (med) {
          med.stock = Number(med.stock || 0) + Number(it.quantity || 0);
          await med.save();
        }
      }
    } catch (e) {
      console.warn('Stock restoration failed during cancel:', e);
    }

    d.paymentStatus = 'cancelled';
    await d.save();

    res.json({ success: true, data: d, message: 'Dispense cancelled and stock restored' });
  } catch (error) {
    console.error('Cancel dispense error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/dispensary/dispenses/:id/pay
// @desc    Collect payment and generate bill number
// @access  Private (chemist, admin)
router.post('/dispenses/:id/pay', auth, authorize('chemist', 'admin'), [
  body('amount').isNumeric().withMessage('Amount must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const d = await Dispense.findById(req.params.id);
    if (!d) return res.status(404).json({ message: 'Dispense record not found' });
    if (d.paymentStatus === 'cancelled') return res.status(400).json({ message: 'Cannot pay for cancelled dispense' });

    const amount = Number(req.body.amount);
    d.paidAmount = Number(d.paidAmount || 0) + amount;

    if (d.paidAmount >= d.total) {
      d.paymentStatus = 'paid';
    } else if (d.paidAmount > 0) {
      d.paymentStatus = 'partial';
    } else {
      d.paymentStatus = 'pending';
    }

    if (!d.billNumber && d.paymentStatus !== 'pending') {
      // Simple bill number: YYYYMMDD-<timestamp>-<shortId>
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      d.billNumber = `${y}${m}${day}-${Date.now().toString().slice(-6)}-${String(d._id).slice(-6)}`;
    }

    await d.save();

    res.json({ success: true, data: d, message: 'Payment recorded' });
  } catch (error) {
    console.error('Collect payment error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;
// @route   GET /api/dispensary/prefill
// @desc    Prefill dispense items from latest prescription by appointmentId or patientId
// @access  Private (chemist, admin)
router.get('/prefill', auth, authorize('chemist', 'admin'), async (req, res) => {
  try {
    const { appointmentId, patientId } = req.query;
    let patient;
    let appointment;

    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId);
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      patient = await Patient.findById(appointment.patient);
    } else if (patientId) {
      patient = await Patient.findById(patientId);
    } else {
      return res.status(400).json({ message: 'Provide appointmentId or patientId' });
    }
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Find latest medical record with prescription for this patient (and appointment if provided)
    const query = { patient: patient._id, 'prescription.medications.0': { $exists: true } };
    if (appointment) query.appointment = appointment._id;
    const mr = await MedicalRecord.findOne(query).sort({ visitDate: -1 });
    if (!mr || !mr.prescription || !(mr.prescription.medications || []).length) {
      return res.json({ success: true, data: [] });
    }

    // Map to dispense items with sellingPrice and structured fields
    const items = [];
    for (const med of mr.prescription.medications) {
      const lookup = await Medicine.findOne({ name: med.name, strength: med.strength || '', form: med.form || '' });
      const unitPrice = lookup?.sellingPrice || 0;
      items.push({
        name: med.name,
        strength: med.strength || '',
        form: med.form || '',
        duration: med.duration || '',
        quantity: 1,
        unitPrice,
        notes: `${med.strength ? '(' + med.strength + ') ' : ''}${med.dosage || ''} ${med.frequency || ''} ${med.duration || ''}`.trim()
      });
    }

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Prefill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
