import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import { patientAPI, doctorAPI, appointmentAPI, medicalRecordAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    appointments: 0,
    medicalRecords: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, doctorsRes, appointmentsRes, medicalRecordsRes] = await Promise.all([
        patientAPI.getAll({ limit: 1 }),
        doctorAPI.getAll({ limit: 1 }),
        appointmentAPI.getAll({ limit: 5 }),
        medicalRecordAPI.getAll({ limit: 1 }),
      ]);

      setStats({
        patients: patientsRes.data.pagination.total,
        doctors: doctorsRes.data.pagination.total,
        appointments: appointmentsRes.data.pagination.total,
        medicalRecords: medicalRecordsRes.data.pagination.total,
      });

      setRecentAppointments(appointmentsRes.data.data.slice(0, 5));
      
      // Get upcoming appointments (today and future)
      const today = new Date().toISOString().split('T')[0];
      const upcomingRes = await appointmentAPI.getAll({ 
        date: today,
        limit: 5 
      });
      setUpcomingAppointments(upcomingRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Total Patients',
      value: stats.patients,
      icon: Users,
      color: 'bg-blue-500',
      href: '/patients',
    },
    {
      name: 'Total Doctors',
      value: stats.doctors,
      icon: UserCheck,
      color: 'bg-green-500',
      href: '/doctors',
    },
    {
      name: 'Total Appointments',
      value: stats.appointments,
      icon: Calendar,
      color: 'bg-purple-500',
      href: '/appointments',
    },
    {
      name: 'Medical Records',
      value: stats.medicalRecords,
      icon: FileText,
      color: 'bg-orange-500',
      href: '/medical-records',
    },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Appointments</h3>
            <Link
              to="/appointments"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentAppointments.length > 0 ? (
              recentAppointments.map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {appointment.patient?.firstName} {appointment.patient?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(appointment.appointmentDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(appointment.appointmentTime)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent appointments</p>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Appointments</h3>
            <Link
              to="/appointments"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
          
          <div className="space-y-3">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <div key={appointment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {appointment.patient?.firstName} {appointment.patient?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {appointment.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(appointment.appointmentDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(appointment.appointmentTime)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/patients/new"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
          >
            <Users className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">Add Patient</span>
          </Link>
          
          <Link
            to="/doctors/new"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
          >
            <UserCheck className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-900">Add Doctor</span>
          </Link>
          
          <Link
            to="/appointments/new"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
          >
            <Calendar className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">Book Appointment</span>
          </Link>
          
          <Link
            to="/medical-records/new"
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors duration-200"
          >
            <FileText className="h-8 w-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-900">Add Record</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

