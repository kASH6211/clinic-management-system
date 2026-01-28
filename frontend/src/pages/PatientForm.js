import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, User, Phone, MapPin, Heart } from 'lucide-react';
import { patientAPI } from '../services/api';
import toast from 'react-hot-toast';

const PatientForm = () => {
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
      fetchPatient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPatient = async () => {
    try {
      setInitialLoading(true);
      const response = await patientAPI.getById(id);
      const patient = response.data.data;
      
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth.split('T')[0],
        gender: patient.gender,
        'address.street': patient.address?.street || '',
        'address.city': patient.address?.city || '',
        'address.state': patient.address?.state || '',
        'address.zipCode': patient.address?.zipCode || '',
        'address.country': patient.address?.country || 'USA',
        'emergencyContact.name': patient.emergencyContact?.name || '',
        'emergencyContact.phone': patient.emergencyContact?.phone || '',
        'emergencyContact.relationship': patient.emergencyContact?.relationship || '',
        'medicalInfo.bloodType': patient.medicalInfo?.bloodType || '',
        'medicalInfo.allergies': patient.medicalInfo?.allergies?.join(', ') || '',
        'medicalInfo.medications': patient.medicalInfo?.medications?.join(', ') || '',
        'medicalInfo.medicalHistory': patient.medicalInfo?.medicalHistory?.join(', ') || '',
        'medicalInfo.insuranceProvider': patient.medicalInfo?.insuranceProvider || '',
        'medicalInfo.insuranceNumber': patient.medicalInfo?.insuranceNumber || '',
        notes: patient.notes || '',
      });
    } catch (error) {
      toast.error('Failed to fetch patient details');
      console.error('Error fetching patient:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Format the data - only include fields that have values
      const formattedData = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      };
      if (data.email && data.email.trim().length) {
        formattedData.email = data.email.trim();
      }

      // Add notes if provided
      if (data.notes) {
        formattedData.notes = data.notes;
      }

      // Add medical info (omit bloodType if empty to satisfy enum)
      formattedData.medicalInfo = {
        allergies: data['medicalInfo.allergies'] ? data['medicalInfo.allergies'].split(',').map(item => item.trim()).filter(Boolean) : [],
        medications: data['medicalInfo.medications'] ? data['medicalInfo.medications'].split(',').map(item => item.trim()).filter(Boolean) : [],
        medicalHistory: data['medicalInfo.medicalHistory'] ? data['medicalInfo.medicalHistory'].split(',').map(item => item.trim()).filter(Boolean) : [],
      };
      if (data['medicalInfo.bloodType']) {
        formattedData.medicalInfo.bloodType = data['medicalInfo.bloodType'];
      }
      if (data['medicalInfo.insuranceProvider']) {
        formattedData.medicalInfo.insuranceProvider = data['medicalInfo.insuranceProvider'];
      }
      if (data['medicalInfo.insuranceNumber']) {
        formattedData.medicalInfo.insuranceNumber = data['medicalInfo.insuranceNumber'];
      }

      // Add address
      formattedData.address = {};
      if (data['address.street']) formattedData.address.street = data['address.street'];
      if (data['address.city']) formattedData.address.city = data['address.city'];
      if (data['address.state']) formattedData.address.state = data['address.state'];
      if (data['address.zipCode']) formattedData.address.zipCode = data['address.zipCode'];
      if (data['address.country']) formattedData.address.country = data['address.country'];

      // Add emergency contact
      formattedData.emergencyContact = {};
      if (data['emergencyContact.name']) formattedData.emergencyContact.name = data['emergencyContact.name'];
      if (data['emergencyContact.phone']) formattedData.emergencyContact.phone = data['emergencyContact.phone'];
      if (data['emergencyContact.relationship']) formattedData.emergencyContact.relationship = data['emergencyContact.relationship'];

      // Remove empty nested objects
      if (Object.keys(formattedData.address).length === 0) delete formattedData.address;
      if (Object.keys(formattedData.emergencyContact).length === 0) delete formattedData.emergencyContact;

      console.log('Submitting formatted data:', JSON.stringify(formattedData, null, 2));
      
      if (isEdit) {
        await patientAPI.update(id, formattedData);
        toast.success('Patient updated successfully');
      } else {
        await patientAPI.create(formattedData);
        toast.success('Patient created successfully');
      }
      
      navigate('/patients');
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      
      const errs = error.response?.data?.errors;
      if (Array.isArray(errs) && errs.length > 0) {
        const firstMsg = errs[0]?.msg || 'Validation error';
        toast.error(`Validation Error: ${firstMsg}`);
        console.error('All validation errors:', errs);
      } else {
        const message = error.response?.data?.message || error.message || 'Failed to save patient';
        toast.error(`Server Error: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/patients')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Patient' : 'Add New Patient'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Update patient information' : 'Enter patient details'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="btn-primary flex items-center"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Saving...' : 'Save Patient'}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="card">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                {...register('firstName', { required: 'First name is required', validate: v => (v?.trim()?.length ? true : 'First name is required') })}
                type="text"
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
                {...register('lastName', { required: 'Last name is required', validate: v => (v?.trim()?.length ? true : 'Last name is required') })}
                type="text"
                className="input-field"
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                className="input-field"
                placeholder="Enter email address (optional)"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                {...register('phone', { required: 'Phone number is required', validate: v => (v?.trim()?.length ? true : 'Phone number is required') })}
                type="tel"
                className="input-field"
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input
                {...register('dateOfBirth', { required: 'Date of birth is required' })}
                type="date"
                className="input-field"
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select
                {...register('gender', { required: 'Gender is required' })}
                className="input-field"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="card">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Address Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Street Address</label>
              <input
                {...register('address.street')}
                type="text"
                className="input-field"
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  {...register('address.city')}
                  type="text"
                  className="input-field"
                  placeholder="Enter city"
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  {...register('address.state')}
                  type="text"
                  className="input-field"
                  placeholder="Enter state"
                />
              </div>

              <div className="form-group">
                <label className="form-label">ZIP Code</label>
                <input
                  {...register('address.zipCode')}
                  type="text"
                  className="input-field"
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                {...register('address.country')}
                type="text"
                className="input-field"
                placeholder="Enter country"
                defaultValue="USA"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Phone className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Emergency Contact</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                {...register('emergencyContact.name')}
                type="text"
                className="input-field"
                placeholder="Enter contact name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                {...register('emergencyContact.phone')}
                type="tel"
                className="input-field"
                placeholder="Enter contact phone"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Relationship</label>
              <input
                {...register('emergencyContact.relationship')}
                type="text"
                className="input-field"
                placeholder="e.g., Spouse, Parent, Sibling"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Heart className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Medical Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Blood Type</label>
              <select {...register('medicalInfo.bloodType')} className="input-field">
                <option value="">Select blood type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Insurance Provider</label>
              <input
                {...register('medicalInfo.insuranceProvider')}
                type="text"
                className="input-field"
                placeholder="Enter insurance provider"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Insurance Number</label>
              <input
                {...register('medicalInfo.insuranceNumber')}
                type="text"
                className="input-field"
                placeholder="Enter insurance number"
              />
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <div className="form-group">
              <label className="form-label">Allergies</label>
              <input
                {...register('medicalInfo.allergies')}
                type="text"
                className="input-field"
                placeholder="Enter allergies (comma-separated)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Medications</label>
              <input
                {...register('medicalInfo.medications')}
                type="text"
                className="input-field"
                placeholder="Enter current medications (comma-separated)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Medical History</label>
              <input
                {...register('medicalInfo.medicalHistory')}
                type="text"
                className="input-field"
                placeholder="Enter medical history (comma-separated)"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              {...register('notes')}
              rows={4}
              className="input-field"
              placeholder="Enter any additional notes about the patient"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;

