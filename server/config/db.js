const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartlab');
    console.log(`[SmartLab DB] Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[SmartLab DB Error] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
