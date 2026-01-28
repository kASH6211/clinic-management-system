const express = require('express');
const { body, validationResult } = require('express-validator');
const { Appointment, Patient, Doctor } = require('../models');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get all appointments
// @access  Private
router.get('/', auth, authorize('admin', 'receptionist', 'doctor', 'chemist'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { doctorId, patientId, status, date, search } = req.query;

    let query = {};

    if (doctorId) query.doctor = doctorId;
    // Scope: doctor role only sees own appointments
    if (req.user.role === 'doctor' && req.user.doctorId) {
      query.doctor = req.user.doctorId;
    }
    if (patientId) query.patient = patientId;
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    // Sort by dailyToken if a specific date is provided; otherwise by date then token
    const sortSpec = date
      ? { appointmentDay: 1, dailyToken: 1 }
      : { appointmentDate: 1, dailyToken: 1, appointmentTime: 1 };

    // If a search term is provided, find matching patients and restrict by those IDs
    if (search) {
      const patQuery = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { regNo: { $regex: search, $options: 'i' } },
        ]
      };
      const pats = await Patient.find(patQuery).select('_id');
      const ids = pats.map(p => p._id);
      // If no patients match, return empty
      if (ids.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { current: page, pages: 0, total: 0 }
        });
      }
      query.patient = { $in: ids };
    }

    const appointments = await Appointment.find(query)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', auth, authorize('admin', 'receptionist', 'doctor', 'chemist'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Scope: doctor can only access own appointment
    if (req.user.role === 'doctor' && req.user.doctorId && String(appointment.doctor._id) !== req.user.doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private
router.post('/', auth, authorize('admin', 'receptionist', 'doctor'), [
  body('patient').isMongoId().withMessage('Valid patient ID is required'),
  body('doctor').isMongoId().withMessage('Valid doctor ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').notEmpty().withMessage('Appointment time is required'),
  body('reason').notEmpty().withMessage('Reason for appointment is required'),
  body('type').optional().isIn(['consultation', 'follow-up', 'emergency', 'routine-checkup', 'vaccination'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointmentData = req.body;

    // If doctor role, enforce creating only for self
    if (req.user.role === 'doctor') {
      if (!req.user.doctorId || String(appointmentData.doctor) !== req.user.doctorId) {
        return res.status(403).json({ message: 'Doctors can only create their own appointments' });
      }
    }

    // Check if patient exists
    const patient = await Patient.findById(appointmentData.patient);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(appointmentData.doctor);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      doctor: appointmentData.doctor,
      appointmentDate: appointmentData.appointmentDate,
      appointmentTime: appointmentData.appointmentTime,
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        message: 'Doctor already has an appointment at this time'
      });
    }

    // Normalize appointmentDay (truncate to 00:00:00)
    const day = new Date(appointmentData.appointmentDate);
    day.setHours(0, 0, 0, 0);
    appointmentData.appointmentDay = day;

    // Derive payment status from split payments if provided
    if (typeof appointmentData.paymentOnline !== 'undefined' || typeof appointmentData.paymentOffline !== 'undefined') {
      const paid = Number(appointmentData.paymentOnline || 0) + Number(appointmentData.paymentOffline || 0);
      const amount = Number(appointmentData.amount || 0);
      const discount = Number(appointmentData.discount || 0);
      const payable = Math.max(0, amount - discount);

      if (paid <= 0) appointmentData.paymentStatus = 'pending';
      else if (paid < payable) appointmentData.paymentStatus = 'partial';
      else appointmentData.paymentStatus = 'paid';
    }

    // Assign next dailyToken for the day with simple retry on duplicate
    let saved;
    for (let attempt = 0; attempt < 3; attempt++) {
      const count = await Appointment.countDocuments({ appointmentDay: day });
      appointmentData.dailyToken = count + 1;
      try {
        const appointment = new Appointment(appointmentData);
        saved = await appointment.save();
        break;
      } catch (e) {
        // Duplicate key error from unique index, retry
        if (e && e.code === 11000) {
          continue;
        }
        throw e;
      }
    }

    if (!saved) {
      return res.status(500).json({ message: 'Failed to assign daily token, please try again.' });
    }

    res.status(201).json({
      success: true,
      data: saved,
      message: 'Appointment created successfully'
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', auth, authorize('admin', 'receptionist', 'doctor'), [
  body('appointmentDate').optional().isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').optional().notEmpty().withMessage('Appointment time is required'),
  body('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']),
  body('type').optional().isIn(['consultation', 'follow-up', 'emergency', 'routine-checkup', 'vaccination']),
  body('discount').optional().isNumeric(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Scope: doctor can only update own appointment
    if (req.user.role === 'doctor' && req.user.doctorId && String(appointment.doctor._id) !== req.user.doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate patient change (if provided)
    if (req.body.patient) {
      const pat = await Patient.findById(req.body.patient);
      if (!pat) return res.status(404).json({ message: 'Patient not found' });
    }

    // If doctor is changing, validate and optionally set amount to new doctor's fee
    let effectiveDoctor = appointment.doctor;
    if (req.body.doctor) {
      const newDoc = await Doctor.findById(req.body.doctor);
      if (!newDoc) return res.status(404).json({ message: 'Doctor not found' });
      effectiveDoctor = newDoc._id;
      // If amount not provided in update, default to the new doctor's consultation fee
      if (typeof req.body.amount === 'undefined' && typeof newDoc.consultationFee !== 'undefined') {
        req.body.amount = newDoc.consultationFee;
      }
    }

    // Check for conflicting appointments if date/time or doctor is being changed
    if (req.body.appointmentDate || req.body.appointmentTime || req.body.doctor) {
      const appointmentDate = req.body.appointmentDate || appointment.appointmentDate;
      const appointmentTime = req.body.appointmentTime || appointment.appointmentTime;
      const doctorToCheck = req.body.doctor ? effectiveDoctor : appointment.doctor;

      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: req.params.id },
        doctor: doctorToCheck,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        status: { $in: ['scheduled', 'confirmed'] }
      });

      if (conflictingAppointment) {
        return res.status(400).json({
          message: 'Doctor already has an appointment at this time'
        });
      }
    }

    // If date is changing, recompute appointmentDay and dailyToken
    let updateBody = { ...req.body };
    if (req.body.appointmentDate) {
      const day = new Date(req.body.appointmentDate);
      day.setHours(0, 0, 0, 0);
      updateBody.appointmentDay = day;

      // assign new token for that day (retry on duplicate)
      for (let attempt = 0; attempt < 3; attempt++) {
        const count = await Appointment.countDocuments({ appointmentDay: day, _id: { $ne: req.params.id } });
        updateBody.dailyToken = count + 1;
        // Recompute paymentStatus here as well when date changes
        if (typeof updateBody.paymentOnline !== 'undefined' || typeof updateBody.paymentOffline !== 'undefined' || typeof updateBody.amount !== 'undefined' || typeof updateBody.discount !== 'undefined') {
          const current = await Appointment.findById(req.params.id);
          const paid = Number(updateBody.paymentOnline ?? current.paymentOnline ?? 0) + Number(updateBody.paymentOffline ?? current.paymentOffline ?? 0);
          const amount = Number(updateBody.amount ?? current.amount ?? 0);
          const discount = Number(updateBody.discount ?? current.discount ?? 0);
          const payable = Math.max(0, amount - discount);

          if (paid <= 0) updateBody.paymentStatus = 'pending';
          else if (paid < payable) updateBody.paymentStatus = 'partial';
          else updateBody.paymentStatus = 'paid';
        }
        try {
          const updatedAppointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            updateBody,
            { new: true, runValidators: true }
          );
          return res.json({
            success: true,
            data: updatedAppointment,
            message: 'Appointment updated successfully'
          });
        } catch (e) {
          if (e && e.code === 11000) continue;
          throw e;
        }
      }
      return res.status(500).json({ message: 'Failed to assign daily token on update, please try again.' });
    }

    // If payment fields are present, recompute paymentStatus
    if (typeof updateBody.paymentOnline !== 'undefined' || typeof updateBody.paymentOffline !== 'undefined' || typeof updateBody.amount !== 'undefined' || typeof updateBody.discount !== 'undefined') {
      const current = await Appointment.findById(req.params.id);
      const paid = Number(updateBody.paymentOnline ?? current.paymentOnline ?? 0) + Number(updateBody.paymentOffline ?? current.paymentOffline ?? 0);
      const amount = Number(updateBody.amount ?? current.amount ?? 0);
      const discount = Number(updateBody.discount ?? current.discount ?? 0);
      const payable = Math.max(0, amount - discount);

      if (paid <= 0) updateBody.paymentStatus = 'pending';
      else if (paid < payable) updateBody.paymentStatus = 'partial';
      else updateBody.paymentStatus = 'paid';
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateBody,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment
// @access  Private
router.delete('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/doctor/:doctorId/availability
// @desc    Get doctor's availability for a specific date
// @access  Private
router.get('/doctor/:doctorId/availability', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get existing appointments for the date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const existingAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: startDate, $lt: endDate },
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('appointmentTime duration');

    // Get day of week key
    const dayShort = startDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    const dayKey = dayShort === 'sun' ? 'sunday' :
      dayShort === 'mon' ? 'monday' :
        dayShort === 'tue' ? 'tuesday' :
          dayShort === 'wed' ? 'wednesday' :
            dayShort === 'thu' ? 'thursday' :
              dayShort === 'fri' ? 'friday' : 'saturday';

    const availability = (doctor.availability && doctor.availability[dayKey]) || { isAvailable: false };

    if (!availability.isAvailable) {
      return res.json({
        success: true,
        data: {
          isAvailable: false,
          message: 'Doctor is not available on this day'
        }
      });
    }

    // Generate available time slots
    const availableSlots = [];
    const startTime = availability.startTime;
    const endTime = availability.endTime;
    const slotDuration = 30; // 30 minutes per slot

    // Convert time strings to minutes for easier calculation
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (let time = startMinutes; time < endMinutes; time += slotDuration) {
      const timeStr = minutesToTime(time);

      // Check if this time slot is already booked
      const isBooked = existingAppointments.some(apt => apt.appointmentTime === timeStr);

      if (!isBooked) {
        availableSlots.push(timeStr);
      }
    }

    res.json({
      success: true,
      data: {
        isAvailable: true,
        availableSlots,
        workingHours: {
          start: startTime,
          end: endTime
        }
      }
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

