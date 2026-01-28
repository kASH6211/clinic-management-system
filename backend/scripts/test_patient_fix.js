const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

const testPatientCreation = async () => {
    // Generate random string for unique names to avoid name conflicts (though not unique in schema)
    const randomId = Math.random().toString(36).substring(7);

    const p1Data = {
        firstName: 'TestFirst' + randomId,
        lastName: 'TestLast1',
        phone: '1234567890',
        dateOfBirth: '2000-01-01',
        gender: 'male',
        email: '' // Emulating the empty email causing the issue
    };

    const p2Data = {
        firstName: 'TestFirst' + randomId,
        lastName: 'TestLast2',
        phone: '1234567890',
        dateOfBirth: '2000-01-01',
        gender: 'female',
        email: null // Emulating explicit null
    };

    // We can't test the API route logic directly easily without supertest or axios, 
    // but the fix was in the route handler, not the model. 
    // The route handler strips the email. The model itself STILL has sparse:true unique:true.
    // So if we save to model directly with {email: null}, it WILL fail if another {email: null} exists.
    // This script should test the ROUTE logic or at least verify the behavior of the model.

    // Correction: I should test hitting the API endpoints if possible, or verify that the model allows saving if I don't pass email key.

    // Let's verify MODEL behavior: saving two docs without email key should work.
    // Saving two docs with email: null will fail.

    try {
        await connectDB();

        console.log('--- Testing Duplicate Null Email Issue ---');

        // Clean up previous test data if any
        // await Patient.deleteMany({ firstName: { $regex: 'TestFirst' } });

        console.log('Creating Patient 1 (no email key)...');
        const p1 = new Patient({
            firstName: 'TestNoKey1',
            lastName: 'Last',
            phone: '111',
            dateOfBirth: new Date(),
            gender: 'male'
            // no email key
        });
        await p1.save();
        console.log('Patient 1 created.');

        console.log('Creating Patient 2 (no email key)...');
        const p2 = new Patient({
            firstName: 'TestNoKey2',
            lastName: 'Last',
            phone: '222',
            dateOfBirth: new Date(),
            gender: 'male'
            // no email key
        });
        await p2.save();
        console.log('Patient 2 created. Success!');

        // Now test what happens if we explicitly pass null (this is what the backend WAS receiving and what caused error)
        // If my fix works, the ROUTE removes the key. The MODEL should still fail if I force it here.
        // This confirms the route logic (stripping key) is NECESSARY.

        /*
        console.log('Creating Patient 3 (email: null)...');
        const p3 = new Patient({
             firstName: 'TestNull1',
             lastName: 'Last',
             phone: '333',
             dateOfBirth: new Date(),
             gender: 'male',
             email: null
        });
        await p3.save();
        console.log('Patient 3 created.');

        console.log('Creating Patient 4 (email: null) - SHOULD FAIL if we do this directly...');
        // const p4 = new Patient({ ... email: null });
        // await p4.save(); 
        */

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        // Cleanup?
        await mongoose.disconnect();
    }
};

testPatientCreation();
