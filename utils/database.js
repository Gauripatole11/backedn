const mongoose = require('mongoose');
require('../models/user.model');  // Import User model first
require('../models/securityKeys.model');
require('../models/keyAssignment.model');
require('dotenv').config();


const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;