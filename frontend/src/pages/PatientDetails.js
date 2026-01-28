import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Heart,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import { patientAPI, appointmentAPI, medicalRecordAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const PatientDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchPatientDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch patient data first
      const patientRes = await patientAPI.getById(id);
      setPatient(patientRes.data.data);
      
      // Then try to fetch appointments and medical records (they might fail if no data exists)
      try {
        const appointmentsRes = await appointmentAPI.getAll({ patientId: id, limit: 10 });
        setAppointments(appointmentsRes.data.data || []);
      } catch (err) {
        console.log('No appointments found:', err);
        setAppointments([]);
      }
      
      try {
        const medicalRecordsRes = await medicalRecordAPI.getByPatient(id, { limit: 10 });
        setMedicalRecords(medicalRecordsRes.data.data || []);
      } catch (err) {
        console.log('No medical records found:', err);
        setMedicalRecords([]);
      }

      // If logged in user is a doctor, fetch previous appointments of THIS patient with THIS doctor (scoped by backend)
      try {
        if (user?.role === 'doctor') {
          const res = await appointmentAPI.getAll({ patientId: id, limit: 20 });
          setDoctorAppointments(res.data.data || []);
        } else {
          setDoctorAppointments([]);
        }
      } catch (err) {
        console.log('Doctor appointments fetch failed:', err);
        setDoctorAppointments([]);
      }
    } catch (error) {
      toast.error('Failed to fetch patient details');
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Patient not found</h3>
        <p className="text-gray-500 mb-4">The patient you're looking for doesn't exist.</p>
        <Link to="/patients" className="btn-primary">
          Back to Patients
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: User },
    { id: 'appointments', name: 'Appointments', icon: Calendar },
    { id: 'medical-records', name: 'Medical Records', icon: FileText },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/patients"
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-600">Patient Details</p>
          </div>
        </div>
        <Link
          to={`/patients/${patient._id}/edit`}
          className="btn-primary flex items-center"
        >
          <Edit className="h-5 w-5 mr-2" />
          Edit Patient
        </Link>
      </div>

      {/* Patient Info Card */}
      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600">
              {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
            </span>
          </div>
          
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h3>
                <div className="space-y-2">
                  {patient.regNo && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">Reg No: {patient.regNo}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{patient.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{patient.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {calculateAge(patient.dateOfBirth)} years old
                    </span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900 capitalize">{patient.gender}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
                <div className="space-y-2">
                  {patient.address && (patient.address.street || patient.address.city) ? (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                      <div className="text-sm text-gray-900">
                        {patient.address.street && <div>{patient.address.street}</div>}
                        {(patient.address.city || patient.address.state || patient.address.zipCode) && (
                          <div>
                            {patient.address.city}{patient.address.state && `, ${patient.address.state}`} {patient.address.zipCode}
                          </div>
                        )}
                        {patient.address.country && <div>{patient.address.country}</div>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No address provided</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Emergency Contact</h3>
                <div className="space-y-2">
                  {patient.emergencyContact && (patient.emergencyContact.name || patient.emergencyContact.phone) ? (
                    <div className="text-sm text-gray-900">
                      {patient.emergencyContact.name && <div className="font-medium">{patient.emergencyContact.name}</div>}
                      {patient.emergencyContact.phone && <div>{patient.emergencyContact.phone}</div>}
                      {patient.emergencyContact.relationship && <div className="text-gray-500">{patient.emergencyContact.relationship}</div>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No emergency contact provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      {patient.medicalInfo && (
        <div className="card">
          <div className="flex items-center mb-4">
            <Heart className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Medical Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patient.medicalInfo.bloodType && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Blood Type</h3>
                <p className="text-sm text-gray-900">{patient.medicalInfo.bloodType}</p>
              </div>
            )}
            
            {patient.medicalInfo.insuranceProvider && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Insurance Provider</h3>
                <p className="text-sm text-gray-900">{patient.medicalInfo.insuranceProvider}</p>
              </div>
            )}
            
            {patient.medicalInfo.insuranceNumber && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Insurance Number</h3>
                <p className="text-sm text-gray-900">{patient.medicalInfo.insuranceNumber}</p>
              </div>
            )}
          </div>

          {(patient.medicalInfo.allergies?.length > 0 || 
            patient.medicalInfo.medications?.length > 0 || 
            patient.medicalInfo.medicalHistory?.length > 0) && (
            <div className="mt-6 space-y-4">
              {patient.medicalInfo.allergies?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Allergies</h3>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalInfo.allergies.map((allergy, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {patient.medicalInfo.medications?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Current Medications</h3>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalInfo.medications.map((medication, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {medication}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {patient.medicalInfo.medicalHistory?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Medical History</h3>
                  <div className="flex flex-wrap gap-2">
                    {patient.medicalInfo.medicalHistory.map((history, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {history}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Previous visits with this doctor (doctor role only) */}
      {user?.role === 'doctor' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous visits with you</h2>
          {doctorAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctorAppointments.map((a) => (
                    <tr key={a._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(a.appointmentDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.appointmentTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No previous appointments found with you for this patient.</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{appointments.length}</div>
                  <div className="text-sm text-blue-800">Total Appointments</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{medicalRecords.length}</div>
                  <div className="text-sm text-green-800">Medical Records</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {appointments.filter(apt => apt.status === 'completed').length}
                  </div>
                  <div className="text-sm text-purple-800">Completed Visits</div>
                </div>
              </div>

              {patient.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{patient.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <div key={appointment._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {formatDate(appointment.appointmentDate)} at {formatTime(appointment.appointmentTime)}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName} - {appointment.doctor?.specialization}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{appointment.reason}</p>
                      </div>
                      <Link
                        to={`/appointments/${appointment._id}`}
                        className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No appointments found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'medical-records' && (
            <div className="space-y-4">
              {medicalRecords.length > 0 ? (
                medicalRecords.map((record) => (
                  <div key={record._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {formatDate(record.visitDate)}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Dr. {record.doctor?.user?.firstName} {record.doctor?.user?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{record.chiefComplaint}</p>
                        {record.diagnosis?.primary && (
                          <p className="text-sm text-gray-500 mt-1">
                            Diagnosis: {record.diagnosis.primary}
                          </p>
                        )}
                      </div>
                      <Link
                        to={`/medical-records/${record._id}`}
                        className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No medical records found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetails;

