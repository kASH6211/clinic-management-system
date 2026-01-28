import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, UserCheck, Stethoscope, Mail, Phone } from 'lucide-react';
import { doctorAPI } from '../services/api';
import toast from 'react-hot-toast';

const DoctorForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  useEffect(() => {
    if (isEdit) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      setInitialLoading(true);
      const response = await doctorAPI.getById(id);
      const doctor = response.data.data;
      
      reset({
        firstName: doctor.user?.firstName || '',
        lastName: doctor.user?.lastName || '',
        email: doctor.user?.email || '',
        phone: doctor.user?.phone || '',
        specialization: doctor.specialization || '',
        licenseNumber: doctor.licenseNumber || '',
        experience: doctor.experience?.toString() || '',
        consultationFee: doctor.consultationFee?.toString() || '',
      });
    } catch (error) {
      toast.error('Failed to fetch doctor details');
      console.error('Error fetching doctor:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      if (isEdit) {
        const updateData = {
          specialization: data.specialization,
          licenseNumber: data.licenseNumber,
          experience: Number(data.experience),
          consultationFee: Number(data.consultationFee),
        };
        await doctorAPI.update(id, updateData);
        toast.success('Doctor updated successfully');
      } else {
        const payload = {
          userData: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            password: data.password,
          },
          specialization: data.specialization,
          licenseNumber: data.licenseNumber,
          experience: Number(data.experience),
          consultationFee: Number(data.consultationFee),
        };
        await doctorAPI.create(payload);
        toast.success('Doctor created successfully');
      }
      
      navigate('/doctors');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save doctor';
      toast.error(message);
      console.error('Error saving doctor:', error);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/doctors')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Doctor' : 'Add New Doctor'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Update doctor profile' : 'Create a new doctor profile'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="btn-primary flex items-center"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Saving...' : 'Save Doctor'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <div className="flex items-center mb-4">
            <UserCheck className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                {...register('firstName', { required: 'First name is required' })}
                className="input-field"
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                {...register('lastName', { required: 'Last name is required' })}
                className="input-field"
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                className="input-field"
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                {...register('phone', { required: 'Phone number is required' })}
                type="tel"
                className="input-field"
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                  type="password"
                  className="input-field"
                  placeholder="Set a password for the doctor account"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center mt-6 mb-4">
            <Stethoscope className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Professional Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Specialization *</label>
              <input
                {...register('specialization', { required: 'Specialization is required' })}
                className="input-field"
                placeholder="Enter specialization"
              />
              {errors.specialization && (
                <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">License Number *</label>
              <input
                {...register('licenseNumber', { required: 'License number is required' })}
                className="input-field"
                placeholder="Enter license number"
              />
              {errors.licenseNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.licenseNumber.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Experience (years) *</label>
              <input
                {...register('experience', {
                  required: 'Experience is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Please enter a valid number' },
                })}
                type="number"
                className="input-field"
                placeholder="Enter years of experience"
              />
              {errors.experience && (
                <p className="mt-1 text-sm text-red-600">{errors.experience.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Consultation Fee *</label>
              <input
                {...register('consultationFee', {
                  required: 'Consultation fee is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Please enter a valid amount' },
                })}
                type="number"
                className="input-field"
                placeholder="Enter consultation fee"
              />
              {errors.consultationFee && (
                <p className="mt-1 text-sm text-red-600">{errors.consultationFee.message}</p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DoctorForm;