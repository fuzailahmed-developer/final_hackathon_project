const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hcm_lite';
    const conn = await mongoose.connect(mongoUri);
    console.log(`[HCM Lite] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[HCM Lite] Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
