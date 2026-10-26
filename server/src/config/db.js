const mongoose = require('mongoose');

let connectionPromise = null;

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI ||
    (process.env.NODE_ENV === 'production' ? null : 'mongodb://127.0.0.1:27017/hcm_lite');
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2 && connectionPromise) return connectionPromise;
  connectionPromise = null;

  connectionPromise = mongoose.connect(mongoUri)
    .then((conn) => {
      console.log(`[HCM Lite] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
