import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Stethoscope, Edit, Phone, Mail } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { appointmentAPI } from '../services/api';
import toast from 'react-hot-toast';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.getById(id);
      setAppointment(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch appointment details');
      console.error('Error fetching appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      'no-show': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/appointments')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
            <p className="text-gray-600">Appointment not found</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
            <p className="text-gray-600">View appointment information</p>
          </div>
        </div>
        <Link
          to={`/appointments/${appointment._id}/edit`}
          className="btn-primary flex items-center"
        >
          <Edit className="h-5 w-5 mr-2" />
          Edit Appointment
        </Link>
      </div>

      {/* Appointment Info Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              {formatDate(appointment.appointmentDate)} at {formatTime(appointment.appointmentTime)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {typeof appointment.dailyToken !== 'undefined' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Token #{appointment.dailyToken}
              </span>
            )}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Patient Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Patient Information
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-gray-900 font-medium">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </p>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                {appointment.patient.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                {appointment.patient.phone}
              </div>
            </div>
          </div>

          {/* Doctor Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <Stethoscope className="h-4 w-4 mr-2" />
              Doctor Information
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-gray-900 font-medium">
                  Dr. {appointment.doctor.user.firstName} {appointment.doctor.user.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Specialization</p>
                <p className="text-gray-900">{appointment.doctor.specialization}</p>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                {appointment.doctor.user.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-gray-900">{appointment.duration} minutes</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="text-gray-900 capitalize">{appointment.type}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500">Reason</p>
            <p className="text-gray-900">{appointment.reason}</p>
          </div>
          {appointment.notes && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Additional Notes</p>
              <p className="text-gray-900">{appointment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Information */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(appointment.paymentStatus)}`}>
            {appointment.paymentStatus}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Consultation Fee</p>
            <p className="text-gray-900">{typeof appointment.amount !== 'undefined' ? appointment.amount : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Paid Online</p>
            <p className="text-gray-900">{appointment.paymentOnline ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Paid Offline</p>
            <p className="text-gray-900">{appointment.paymentOffline ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="text-gray-900">{(Number(appointment.paymentOnline || 0) + Number(appointment.paymentOffline || 0)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="text-gray-900">{formatDate(appointment.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-gray-900">{formatDate(appointment.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetails;

