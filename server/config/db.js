// Database connection helper - connects to MongoDB if available, otherwise lets server run locally
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindcare_ai';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2500
    });
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.log('MongoDB not detected locally. Running in memory / local storage mode.');
  }
};

module.exports = { connectDB, isConnected: () => isConnected };
