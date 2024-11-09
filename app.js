var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const connectDB = require('./utils/database')
var adminRouter = require('./routes/admin.routes');
var usersRouter = require('./routes/users.routes');
const { createInitialAdmin } = require('./utils/initSetup');
const ApiError = require('./utils/errors');

const cors = require('cors')


const initializeApp = async () => {
    try {
        // Create initial admin if doesn't exist
        const adminSetup = await createInitialAdmin();
        if (adminSetup.success && adminSetup.mfaSecret) {
            console.log('=================================================');
            console.log('IMPORTANT: INITIAL ADMIN CREDENTIALS');
            console.log('=================================================');
            console.log('Email:', adminSetup.email);
            console.log('Password:', adminSetup.password);
            console.log('MFA Secret:', adminSetup.qrCodeUrl);
            console.log('=================================================');
            console.log('PLEASE CHANGE THESE CREDENTIALS AFTER FIRST LOGIN');
            console.log('=================================================');
        }

    } catch (error) {
        console.error('Error starting application:', error);
        process.exit(1);
    }
};


var app = express();

connectDB();
initializeApp();
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',(req,res)=>{
    res.json({
        status:"Hosted"
    }).json(200)
})
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.use('/api/admin', adminRouter);
app.use('/api/user', usersRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            details: err.details
        });
    }

    // Handle mongoose errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation Error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            status: 'fail',
            message: 'Duplicate Key Error',
            details: Object.keys(err.keyValue)
        });
    }

    // Default error
    return res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : null
    });
});




module.exports = app;
