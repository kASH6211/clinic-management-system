import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientForm from './pages/PatientForm';
import PatientDetails from './pages/PatientDetails';
import Doctors from './pages/Doctors';
import DoctorForm from './pages/DoctorForm';
import DoctorDetails from './pages/DoctorDetails';
import Appointments from './pages/Appointments';
import AppointmentForm from './pages/AppointmentForm';
import AppointmentDetails from './pages/AppointmentDetails';
import MedicalRecords from './pages/MedicalRecords';
import MedicalRecordForm from './pages/MedicalRecordForm';
import MedicalRecordDetails from './pages/MedicalRecordDetails';
import Profile from './pages/Profile';
import UserForm from './pages/UserForm';
import Dispensary from './pages/Dispensary';
import Medicines from './pages/Medicines';

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              {/* Registration disabled for public; admin can create users from Users page */}
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                {/* Admin: Create User */}
                <Route path="users/new" element={<UserForm />} />
                
                {/* Patient Routes */}
                <Route path="patients" element={<Patients />} />
                <Route path="patients/new" element={<PatientForm />} />
                <Route path="patients/:id" element={<PatientDetails />} />
                <Route path="patients/:id/edit" element={<PatientForm />} />
                
                {/* Doctor Routes */}
                <Route path="doctors" element={<Doctors />} />
                <Route path="doctors/new" element={<DoctorForm />} />
                <Route path="doctors/:id" element={<DoctorDetails />} />
                <Route path="doctors/:id/edit" element={<DoctorForm />} />
                
                {/* Appointment Routes */}
                <Route path="appointments" element={<Appointments />} />
                <Route path="appointments/new" element={<AppointmentForm />} />
                <Route path="appointments/:id" element={<AppointmentDetails />} />
                <Route path="appointments/:id/edit" element={<AppointmentForm />} />
                
                {/* Medical Record Routes */}
                <Route path="medical-records" element={<MedicalRecords />} />
                <Route path="medical-records/new" element={<MedicalRecordForm />} />
                <Route path="medical-records/:id" element={<MedicalRecordDetails />} />
                <Route path="medical-records/:id/edit" element={<MedicalRecordForm />} />

                {/* Dispensary (Chemist) */}
                <Route path="dispensary" element={<Dispensary />} />

                {/* Medicines Master (Admin/Chemist) */}
                <Route path="medicines" element={<Medicines />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

