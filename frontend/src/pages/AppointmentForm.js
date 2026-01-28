import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Calendar, Clock, User, Stethoscope } from 'lucide-react';
import { appointmentAPI, patientAPI, doctorAPI } from '../services/api';
import toast from 'react-hot-toast';

const AppointmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const doctorInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm();

  const watchedDoctor = watch('doctor');
  const watchedDate = watch('appointmentDate');

  useEffect(() => {
    fetchInitialData();
    if (isEdit) {
      fetchAppointment();
    } else {
      // set defaults for new appointment
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);
      const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      reset({
        appointmentDate: dateStr,
        appointmentTime: timeStr,
        duration: 15,
        type: 'consultation',
        reason: 'Not Mentioned',
        amount: '',
        discount: 0,
        paymentOnline: 0,
        paymentOffline: 0,
      });
    }
  }, [id]);

  useEffect(() => {
    if (watchedDoctor && watchedDate) {
      fetchAvailableSlots();
    }
  }, [watchedDoctor, watchedDate]);

  const fetchInitialData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        patientAPI.getAll({ limit: 1000 }),
        doctorAPI.getAll({ limit: 1000 })
      ]);
      setPatients(patientsRes.data.data);
      setDoctors(doctorsRes.data.data);
      setFilteredPatients(patientsRes.data.data);
      setFilteredDoctors(doctorsRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchAppointment = async () => {
    try {
      setInitialLoading(true);
      const response = await appointmentAPI.getById(id);
      const appointment = response.data.data;

      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
      const doctorName = `Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`;

      setPatientSearch(patientName);
      setDoctorSearch(doctorName);

      reset({
        patient: appointment.patient._id,
        doctor: appointment.doctor._id,
        appointmentDate: appointment.appointmentDate.split('T')[0],
        appointmentTime: appointment.appointmentTime,
        duration: appointment.duration,
        type: appointment.type,
        reason: appointment.reason,
        notes: appointment.notes || '',
        amount: appointment.amount ?? '',
        discount: appointment.discount ?? 0,
        paymentOnline: appointment.paymentOnline ?? 0,
        paymentOffline: appointment.paymentOffline ?? 0,
      });
      setSelectedDoctor(appointment.doctor);
    } catch (error) {
      toast.error('Failed to fetch appointment details');
      console.error('Error fetching appointment:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!watchedDoctor || !watchedDate) return;

    try {
      const response = await appointmentAPI.getDoctorAvailability(watchedDoctor, watchedDate);
      setAvailableSlots(response.data.data.availableSlots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    }
  };

  const handlePatientSearch = (e) => {
    const value = e.target.value;
    setPatientSearch(value);
    setShowPatientDropdown(true);

    const filtered = patients.filter(patient =>
      `${patient.firstName} ${patient.lastName} ${patient.phone || ''} ${patient.regNo || ''}`
        .toLowerCase()
        .includes(value.toLowerCase())
    );
    setFilteredPatients(filtered);
  };

  const handleDoctorSearch = (e) => {
    const value = e.target.value;
    setDoctorSearch(value);
    setShowDoctorDropdown(true);

    const filtered = doctors.filter(doctor =>
      `${doctor.user.firstName} ${doctor.user.lastName} ${doctor.specialization}`
        .toLowerCase()
        .includes(value.toLowerCase())
    );
    setFilteredDoctors(filtered);
  };

  const selectPatient = (patient) => {
    setPatientSearch(`${patient.firstName} ${patient.lastName}`);
    reset({ ...watch(), patient: patient._id });
    setShowPatientDropdown(false);
  };
  const selectDoctor = (doctor) => {
    setDoctorSearch(`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`);
    setSelectedDoctor(doctor);
    if (!isEdit) {
      reset({ ...watch(), doctor: doctor._id, amount: doctor.consultationFee ?? '', paymentOnline: 0, paymentOffline: doctor.consultationFee ?? 0 });
    } else {
      // Update amount to new doctor's fee on edit; leave existing paid values as-is
      const existingPaid = {
        paymentOnline: watch('paymentOnline'),
        paymentOffline: watch('paymentOffline'),
      };
      reset({ ...watch(), doctor: doctor._id, amount: doctor.consultationFee ?? watch('amount'), ...existingPaid });
    }
    // Close the dropdown
    setShowDoctorDropdown(false);
    // Blur the doctor input to close dropdown
    if (doctorInputRef.current) doctorInputRef.current.blur();
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      // Ensure amount is set to doctor fee if missing
      if (!data.amount || Number(data.amount) <= 0) {
        if (selectedDoctor && typeof selectedDoctor.consultationFee !== 'undefined') {
          data.amount = selectedDoctor.consultationFee;
        }
      }
      if (!isEdit) {
        const online = Number(data.paymentOnline || 0);
        const offline = Number(data.paymentOffline || 0);
        const discount = Number(data.discount || 0);
        const amount = Number(data.amount || 0);
        const payable = Math.max(0, amount - discount);

        if (online <= 0 && offline <= 0 && amount > 0) {
          data.paymentOffline = payable;
        }
      }
      // Always coerce numeric fields
      data.amount = Number(data.amount || 0);
      data.discount = Number(data.discount || 0);
      data.paymentOnline = Number(data.paymentOnline || 0);
      data.paymentOffline = Number(data.paymentOffline || 0);

      // Determine payment status
      const totalPaid = data.paymentOnline + data.paymentOffline;
      const payable = Math.max(0, data.amount - data.discount);

      if (totalPaid <= 0) {
        data.paymentStatus = 'pending';
      } else if (totalPaid >= payable) {
        data.paymentStatus = 'paid';
      } else {
        data.paymentStatus = 'partial';
      }

      if (isEdit) {
        await appointmentAPI.update(id, data);
        toast.success('Appointment updated successfully');
      } else {
        await appointmentAPI.create(data);
        toast.success('Appointment created successfully');
      }

      navigate('/appointments');

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save appointment';
      toast.error(message);
      console.error('Error saving appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/appointments')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Appointment' : 'Book New Appointment'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Update appointment details' : 'Schedule a new appointment'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="btn-primary flex items-center"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Saving...' : 'Save Appointment'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Appointment Details */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Appointment Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group relative">
              <label className="form-label">Patient *</label>
              <input
                type="text"
                value={patientSearch}
                onChange={handlePatientSearch}
                onFocus={() => setShowPatientDropdown(true)}
                className="input-field"
                placeholder="Search patient by name, mobile or reg no..."
                autoComplete="off"
              />
              <input
                type="hidden"
                {...register('patient', { required: 'Patient is required' })}
              />
              {showPatientDropdown && filteredPatients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient._id}
                      onClick={() => selectPatient(patient)}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    >
                      <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                      <div className="text-sm text-gray-500">{patient.phone || '—'}</div>
                      {patient.regNo && (
                        <div className="text-xs text-gray-400">Reg: {patient.regNo}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {errors.patient && (
                <p className="mt-1 text-sm text-red-600">{errors.patient.message}</p>
              )}
            </div>

            <div className="form-group relative">
              <label className="form-label">Doctor *</label>
              <input
                ref={doctorInputRef}
                type="text"
                value={doctorSearch}
                onChange={handleDoctorSearch}
                onFocus={() => setShowDoctorDropdown(true)}
                className="input-field"
                placeholder="Search doctor by name or specialization..."
                autoComplete="off"
              />
              <input
                type="hidden"
                {...register('doctor', { required: 'Doctor is required' })}
              />
              {showDoctorDropdown && filteredDoctors.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredDoctors.map((doctor) => (
                    <div
                      key={doctor._id}
                      onClick={() => selectDoctor(doctor)}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                    >
                      <div className="font-medium">Dr. {doctor.user.firstName} {doctor.user.lastName}</div>
                      <div className="text-sm text-gray-500">{doctor.specialization}</div>
                    </div>
                  ))}
                </div>
              )}
              {errors.doctor && (
                <p className="mt-1 text-sm text-red-600">{errors.doctor.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Appointment Date *</label>
              <input
                {...register('appointmentDate', { required: 'Appointment date is required' })}
                type="date"
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.appointmentDate && (
                <p className="mt-1 text-sm text-red-600">{errors.appointmentDate.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Appointment Time *</label>
              {availableSlots.length > 0 ? (
                <select
                  {...register('appointmentTime', { required: 'Appointment time is required' })}
                  className="input-field"
                >
                  <option value="">Select available time</option>
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...register('appointmentTime', { required: 'Appointment time is required' })}
                  type="time"
                  className="input-field"
                />
              )}
              {errors.appointmentTime && (
                <p className="mt-1 text-sm text-red-600">{errors.appointmentTime.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <select
                {...register('duration')}
                className="input-field"
                defaultValue="15"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Appointment Type</label>
              <select
                {...register('type')}
                className="input-field"
                defaultValue="consultation"
              >
                <option value="consultation">Consultation</option>
                <option value="follow-up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="routine-checkup">Routine Checkup</option>
                <option value="vaccination">Vaccination</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Appointment *</label>
            <textarea
              {...register('reason', { required: 'Reason is required' })}
              rows={3}
              className="input-field"
              placeholder="Not Mentioned"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input-field"
              placeholder="Any additional notes or special requirements"
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Stethoscope className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Payment</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="form-group">
              <label className="form-label">Consultation Fee</label>
              <div className="input-field bg-gray-50">
                {typeof selectedDoctor?.consultationFee !== 'undefined' ? selectedDoctor.consultationFee : (watch('amount') || '-')}
              </div>
              <input type="hidden" {...register('amount')} />
            </div>
            <div className="form-group">
              <label className="form-label">Discount</label>
              <input
                type="number"
                step="0.01"
                {...register('discount')}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Paid Online</label>
              <input
                type="number"
                step="0.01"
                {...register('paymentOnline')}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Paid Offline</label>
              <input
                type="number"
                step="0.01"
                {...register('paymentOffline')}
                className="input-field"
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-2 text-right text-sm font-medium text-gray-700">
            Amount Due: {Math.max(0, (Number(watch('amount') || 0) - Number(watch('discount') || 0)) - (Number(watch('paymentOnline') || 0) + Number(watch('paymentOffline') || 0))).toFixed(2)}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;
