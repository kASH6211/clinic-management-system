const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

const fixPatientIndexes = async () => {
    await connectDB();

    try {
        const collection = mongoose.connection.collection('patients');
        const indexes = await collection.indexes();
        console.log('Current Indexes for patients:', indexes);

        const emailIndex = indexes.find(idx => idx.key.email === 1);

        if (emailIndex) {
            console.log('Found email index:', emailIndex);

            // Check if sparse is true
            // Note: MongoDB output might not show 'sparse: true' property if false/undefined?
            // If it is sparse, it should say sparse: true.

            if (!emailIndex.sparse) {
                console.log('Index is NOT sparse (or missing sparse property). Dropping index...');
                await collection.dropIndex(emailIndex.name);
                console.log('Index dropped. The backend restart will recreate it with sparse: true from the schema.');
            } else {
                console.log('Index IS sparse. No action needed? Checking partialFilterExpression...');
                // Sometimes it's partialFilterExpression instead of sparse
                console.log('Index properties:', emailIndex);
            }
        } else {
            console.log('Email index not found. It will be created on server startup.');
        }

        // Also check regNo just in case
        const regNoIndex = indexes.find(idx => idx.key.regNo === 1);
        if (regNoIndex) {
            console.log('Found regNo index:', regNoIndex);
            if (!regNoIndex.sparse) {
                console.log('regNo Index is NOT sparse. Dropping...');
                await collection.dropIndex(regNoIndex.name);
                console.log('regNo Index dropped.');
            }
        }

    } catch (err) {
        console.error('Error fixing indexes:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Done');
    }
};

fixPatientIndexes();
