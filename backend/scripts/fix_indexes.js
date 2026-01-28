const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

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

const fixIndexes = async () => {
    await connectDB();

    try {
        const collection = mongoose.connection.collection('dispenses');
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes);

        const billNumberIndex = indexes.find(idx => idx.key.billNumber === 1);
        if (billNumberIndex) {
            console.log('Found billNumber index:', billNumberIndex);
            if (!billNumberIndex.sparse) {
                console.log('Index is NOT sparse. Dropping index...');
                await collection.dropIndex(billNumberIndex.name);
                console.log('Index dropped. Please restart the backend to recreate it with sparse: true.');
            } else {
                console.log('Index IS sparse. No action needed on index.');
            }
        } else {
            console.log('billNumber index not found.');
            // It might be created by Mongoose on startup
        }

    } catch (err) {
        console.error('Error fixing indexes:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Done');
    }
};

fixIndexes();
