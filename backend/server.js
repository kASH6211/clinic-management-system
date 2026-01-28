const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS for development
const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-management';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/medical-records', require('./routes/medicalRecords'));
app.use('/api/dispensary', require('./routes/dispensary'));
app.use('/api/medicines', require('./routes/medicines'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Clinic Management System API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Get network interfaces for better logging
const os = require('os');
const ifaces = os.networkInterfaces();

console.log('\n=== Server Starting ===');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-management'}`);
console.log('\nAvailable Network Interfaces:');

Object.keys(ifaces).forEach(ifname => {
  ifaces[ifname].forEach(iface => {
    if ('IPv4' === iface.family && !iface.internal) {
      console.log(`- ${ifname}: http://${iface.address}:${PORT}`);
    }
  });
});

console.log('\nLocal Access:');
console.log(`- Local: http://localhost:${PORT}`);
console.log(`- Network: http://${os.hostname()}:${PORT}`);
console.log('\nWaiting for connections...\n');

app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
});

