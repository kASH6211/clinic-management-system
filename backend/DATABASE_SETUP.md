# Clinic Management System - Database Setup

## Prerequisites

1. **Node.js** (v14 or higher)
2. **MongoDB** (v4.4 or higher)
3. **npm** or **yarn**

## Installation Steps

### 1. Install Dependencies

Navigate to the backend directory and install the required packages:

```bash
cd backend
npm install
```

### 2. Database Setup

#### Option A: Local MongoDB Installation

1. **Download and Install MongoDB:**
   - Visit [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Download MongoDB Community Server for Windows
   - Follow the installation wizard

2. **Start MongoDB Service:**
   ```bash
   # Start MongoDB service
   net start MongoDB
   
   # Or start MongoDB manually
   mongod --dbpath "C:\data\db"
   ```

#### Option B: MongoDB Atlas (Cloud Database)

1. **Create MongoDB Atlas Account:**
   - Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account
   - Create a new cluster

2. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update Configuration:**
   - Replace `<password>` with your database password
   - Replace `<dbname>` with your database name

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/clinic-management
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic-management

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 4. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## Database Schema

The system includes the following main collections:

### 1. Users
- **Purpose:** System users (admin, doctors, nurses, receptionists)
- **Key Fields:** firstName, lastName, email, password, role, phone, address

### 2. Patients
- **Purpose:** Patient information and medical history
- **Key Fields:** firstName, lastName, email, phone, dateOfBirth, gender, medicalInfo

### 3. Doctors
- **Purpose:** Doctor profiles and specializations
- **Key Fields:** user (reference), specialization, licenseNumber, availability, consultationFee

### 4. Appointments
- **Purpose:** Appointment scheduling and management
- **Key Fields:** patient, doctor, appointmentDate, appointmentTime, status, reason

### 5. Medical Records
- **Purpose:** Patient medical history and visit records
- **Key Fields:** patient, doctor, visitDate, diagnosis, vitalSigns, treatment

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `POST /api/doctors` - Create new doctor
- `PUT /api/doctors/:id` - Update doctor
- `DELETE /api/doctors/:id` - Delete doctor
- `GET /api/doctors/specializations/list` - Get all specializations

### Appointments
- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `GET /api/appointments/doctor/:doctorId/availability` - Get doctor availability

### Medical Records
- `GET /api/medical-records` - Get all medical records
- `GET /api/medical-records/:id` - Get medical record by ID
- `GET /api/medical-records/patient/:patientId` - Get patient's medical records
- `POST /api/medical-records` - Create new medical record
- `PUT /api/medical-records/:id` - Update medical record
- `DELETE /api/medical-records/:id` - Delete medical record
- `POST /api/medical-records/:id/prescription` - Add prescription

## Testing the Database

### 1. Test Connection
```bash
# Start the server
npm run dev

# Test with curl or Postman
curl http://localhost:5000/
```

### 2. Create Test Data

You can use the API endpoints to create test data:

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "admin@clinic.com",
    "password": "password123",
    "phone": "123-456-7890",
    "role": "admin"
  }'
```

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error:**
   - Ensure MongoDB is running
   - Check the connection string in `.env`
   - Verify network connectivity (for Atlas)

2. **Port Already in Use:**
   - Change the PORT in `.env`
   - Kill existing processes on port 5000

3. **JWT Secret Error:**
   - Ensure JWT_SECRET is set in `.env`
   - Use a strong, random secret key

4. **Permission Errors:**
   - Ensure proper file permissions for uploads directory
   - Run with appropriate user privileges

## Security Considerations

1. **Change Default JWT Secret:** Use a strong, random secret key
2. **Use HTTPS in Production:** Always use HTTPS for production deployments
3. **Validate Input:** All input is validated using express-validator
4. **Password Hashing:** Passwords are hashed using bcrypt
5. **Environment Variables:** Sensitive data stored in environment variables

## Next Steps

1. Set up the frontend application
2. Implement authentication middleware
3. Add file upload functionality
4. Set up email notifications
5. Implement reporting features
6. Add data backup and recovery procedures

