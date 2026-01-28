import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserCheck, Stethoscope, Mail, Phone } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { doctorAPI } from '../services/api';
import toast from 'react-hot-toast';

const DoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getById(id);
      setDoctor(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch doctor details');
      console.error('Error fetching doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/doctors')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Details</h1>
            <p className="text-gray-600">Doctor not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/doctors')}
          className="mr-4 p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Details</h1>
          <p className="text-gray-600">View doctor profile and contact information</p>
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <UserCheck className="h-5 w-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-gray-900">
                  Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900">{doctor.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-gray-900">{doctor.user?.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <Stethoscope className="h-5 w-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Professional Information</h2>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Specialization</p>
                <p className="text-gray-900">{doctor.specialization}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">License Number</p>
                <p className="text-gray-900">{doctor.licenseNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Experience (years)</p>
                <p className="text-gray-900">{doctor.experience ?? 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Consultation Fee</p>
                <p className="text-gray-900">{doctor.consultationFee !== undefined ? doctor.consultationFee : 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Contact Notes</h2>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-500">Additional Notes</p>
            <p className="text-gray-900">{doctor.notes || 'No additional notes'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDetails;