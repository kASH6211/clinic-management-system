const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User } = require('../models');

dotenv.config({ path: '../.env' });

const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-management';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};

const createAdmin = async () => {
    await connectDB();

    const email = 'admin@example.com';
    const password = 'password123';

    try {
        let user = await User.findOne({ email });
        if (user) {
            console.log('Admin user already exists');
            user.password = password; // Reset password
            user.role = 'admin';
            await user.save();
            console.log('Admin password reset to:', password);
        } else {
            user = new User({
                firstName: 'Admin',
                lastName: 'User',
                email,
                password,
                phone: '1234567890',
                role: 'admin',
                isActive: true
            });
            await user.save();
            console.log('Admin user created');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        mongoose.disconnect();
    }
};

createAdmin();
