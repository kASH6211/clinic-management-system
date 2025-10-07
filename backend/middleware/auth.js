const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, Doctor } = require('../models');

// Middleware to verify JWT token
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    // Attach full user context
    const user = await User.findById(decoded.id).select('role _id');
    if (!user) {
      return res.status(401).json({ message: 'User not found for token' });
    }
    req.user = { id: String(user._id), role: user.role };

    // If doctor, also attach doctorId for convenience
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: user._id }).select('_id');
      if (doctor) req.user.doctorId = String(doctor._id);
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    
    next();
  };
};

module.exports = { auth, authorize };

