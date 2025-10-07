# Clinic Management System - Frontend

A modern React frontend application for the Clinic Management System built with React, Tailwind CSS, and React Router.

## Features

- **Authentication System**: Login and registration with JWT tokens
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Patient Management**: Complete CRUD operations for patient records
- **Doctor Management**: Doctor profiles and specialization management
- **Appointment Scheduling**: Book and manage appointments
- **Medical Records**: Patient medical history and records
- **Dashboard**: Overview of system statistics and recent activities
- **Profile Management**: User profile editing and management

## Technology Stack

- **React 18**: Modern React with hooks
- **React Router 6**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form handling and validation
- **Axios**: HTTP client for API requests
- **React Hot Toast**: Toast notifications
- **Lucide React**: Beautiful icons
- **Date-fns**: Date manipulation utilities

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running on port 5000

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a `.env` file in the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Layout.js
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   └── ProtectedRoute.js
│   ├── contexts/
│   │   ├── AuthContext.js
│   │   └── AppContext.js
│   ├── pages/
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── Dashboard.js
│   │   ├── Patients.js
│   │   ├── PatientForm.js
│   │   ├── PatientDetails.js
│   │   ├── Doctors.js
│   │   ├── DoctorForm.js
│   │   ├── DoctorDetails.js
│   │   ├── Appointments.js
│   │   ├── AppointmentForm.js
│   │   ├── AppointmentDetails.js
│   │   ├── MedicalRecords.js
│   │   ├── MedicalRecordForm.js
│   │   ├── MedicalRecordDetails.js
│   │   └── Profile.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Key Components

### Authentication
- **Login**: User authentication with email and password
- **Register**: New user registration with role selection
- **Protected Routes**: Route protection based on authentication status

### Patient Management
- **Patient List**: Paginated list with search functionality
- **Patient Form**: Comprehensive form for adding/editing patients
- **Patient Details**: Detailed view with medical history and appointments

### Dashboard
- **Statistics Cards**: Overview of system metrics
- **Recent Activities**: Latest appointments and records
- **Quick Actions**: Shortcuts to common tasks

### Navigation
- **Sidebar**: Collapsible navigation menu
- **Header**: User info and search functionality
- **Breadcrumbs**: Current page indication

## API Integration

The frontend communicates with the backend through a centralized API service:

```javascript
// Example API usage
import { patientAPI } from '../services/api';

// Get all patients
const patients = await patientAPI.getAll({ page: 1, limit: 10 });

// Create new patient
const newPatient = await patientAPI.create(patientData);

// Update patient
const updatedPatient = await patientAPI.update(id, patientData);
```

## Styling

The application uses Tailwind CSS with custom components:

```css
/* Custom button styles */
.btn-primary {
  @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200;
}

/* Custom input styles */
.input-field {
  @apply w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}
```

## State Management

The application uses React Context for state management:

- **AuthContext**: User authentication and profile data
- **AppContext**: Application-wide state (sidebar, notifications, etc.)

## Form Handling

Forms are handled using React Hook Form with validation:

```javascript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm();

const onSubmit = async (data) => {
  // Handle form submission
};
```

## Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Collapsible sidebar on mobile
- Responsive tables and forms
- Touch-friendly interface

## Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm eject`: Eject from Create React App

## Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:5000/api)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

