var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const connectDB = require('./utils/database')
var adminRouter = require('./routes/admin.routes');
var usersRouter = require('./routes/users.routes');
const { createInitialAdmin } = require('./utils/initSetup');
const ApiError = require('./utils/errors');
const looger = require('./utils/looger')

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
        return adminSetup

    } catch (error) {
        console.error('Error starting application:', error);
        process.exit(1);
    }
};


var app = express();

connectDB();
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.json({
        status: "Hosted"
    }).status(200)
})


app.get('/startup', async (req, res) => {
    try {
        const admin = await initializeApp();

        // Set security headers
        res.set({
            'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'unsafe-inline' 'self'",
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Cache-Control': 'no-store, no-cache, must-revalidate, private'
        });

        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>SecureVault Pro - Initial Setup</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section {
            margin-bottom: 20px;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        .credentials {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
        }
        .qr-code {
            text-align: center;
            margin: 20px 0;
        }
        .qr-code img {
            max-width: 200px;
            height: auto;
        }
        .warning {
            color: #721c24;
            background-color: #f8d7da;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .code {
            background-color: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>SecureVault Pro - Initial Setup</h1>
        
        <div class="warning">
            <strong>Important:</strong> Please save this information securely. 
            This page will only be shown once for security purposes.
        </div>

        <div class="section">
            <h2>Admin Credentials</h2>
            <div class="credentials">
                <p><strong>Email:</strong> ${admin.email}</p>
                <p><strong>Password:</strong> ${admin.password}</p>
                <p><strong>Admin ID:</strong> ${admin.adminId}</p>
            </div>
        </div>

        <div class="section">
            <h2>Admin Details</h2>
            <p><strong>Name:</strong> ${admin.firstName} ${admin.lastName}</p>
            <p><strong>Department:</strong> ${admin.department}</p>
            <p><strong>Role:</strong> ${admin.role}</p>
            <p><strong>Status:</strong> ${admin.status}</p>
        </div>

        <div class="section">
            <h2>MFA Setup</h2>
            <p>Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)</p>
            
            <div class="qr-code">
                <img src="${admin.qrCodeUrl}" alt="MFA QR Code">
            </div>

            <p><strong>Manual Setup Code:</strong></p>
            <div class="code">
                ${admin.mfa.base32}
            </div>

            <p><strong>OTP Auth URL:</strong></p>
            <div class="code">
                ${admin.mfa.otpauthUrl}
            </div>
        </div>

        <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
                <li>Change your password after first login</li>
                <li>Store the MFA backup codes in a secure location</li>
                <li>Do not share these credentials with anyone</li>
            </ul>
        </div>
    </div>

    <script>
        // Optional: Add warning when trying to leave the page
        window.onbeforeunload = function() {
            return "Make sure you have saved all the information before leaving this page!";
        };
    </script>
</body>
</html>`;

        // Send the HTML response with content type
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlTemplate);

    } catch (error) {
        console.error('Startup error:', error);
        res.status(500)
            .setHeader('Content-Type', 'text/html')
            .send(`
                <html>
                    <body>
                        <h1>Setup Error</h1>
                        <p>An error occurred during the initial setup.</p>
                    </body>
                </html>
            `);
    }
});

app.use('/api/admin', adminRouter);
app.use('/api/user', usersRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
    looger.error(err);
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
