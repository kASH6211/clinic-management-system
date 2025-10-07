// Backfill daily tokens for existing appointments
// Usage: node scripts/backfillTokens.js

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Appointment } = require('../models');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-management';
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
};

const truncateToDay = (d) => {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
};

(async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const all = await Appointment.find({}).select('_id appointmentDate appointmentTime appointmentDay dailyToken').lean();
    console.log(`Found ${all.length} appointments`);

    // Group by day
    const byDay = new Map();
    for (const a of all) {
      const day = truncateToDay(a.appointmentDate).getTime();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(a);
    }

    let updates = 0;
    for (const [dayTs, list] of byDay.entries()) {
      // Stable sort by time then existing token
      list.sort((a, b) => {
        if (a.appointmentTime === b.appointmentTime) {
          return (a.dailyToken || 0) - (b.dailyToken || 0);
        }
        return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
      });

      for (let i = 0; i < list.length; i++) {
        const desiredToken = i + 1;
        const id = list[i]._id;
        const day = new Date(Number(dayTs));
        const needsUpdate = (list[i].dailyToken !== desiredToken) || (!list[i].appointmentDay || truncateToDay(list[i].appointmentDay).getTime() !== dayTs);
        if (needsUpdate) {
          await Appointment.updateOne(
            { _id: id },
            { $set: { appointmentDay: day, dailyToken: desiredToken } }
          );
          updates++;
        }
      }
    }

    console.log(`Backfill complete. Updated ${updates} documents.`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill error', err);
    process.exit(1);
  }
})();
