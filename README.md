# FIDO2 Passkey Authentication System (Backend)

Backend implementation for passkey-based authentication system built with Node.js and Express.

## Project Structure
```
backend/
├── controllers/
│   ├── admin.auth.controller.js # Admin authentication
│   ├── admin.controller.js      # Admin operations
│   └── fido2.controller.js      # FIDO2/WebAuthn handling
├── models/
│   ├── auditLog.model.js       # Audit logging
│   ├── challenge.model.js       # FIDO2 challenges
│   ├── keyAssignment.model.js   # Key assignments
│   ├── securityKeys.model.js    # Security keys
│   └── user.model.js           # User data
├── services/
│   ├── audit.service.js        # Audit logging
│   ├── fido2.service.js        # FIDO2 operations
│   └── securityKey.service.js  # Key management
├── middleware/
│   └── auth.middleware.js      # Authentication checks
└── utils/
    ├── database.js             # MongoDB connection
    ├── errors.js              # Error handling
    ├── initSetup.js           # Initial setup
    ├── logger.js              # Winston logger
    └── mfa.js                 # MFA implementation
```

## Getting Started

1. Installation
```bash
git clone https://github.com/Gauripatole11/backedn.git
cd backedn
npm install
```

2. Environment Setup
Create `.env` file:
```env
JWT_SECRET="SECRET"
MONGODB_URI="MONGO"
PORT=3000
RPID="localhost"
ORIGIN="http://localhost:5173"

# Initial Admin Credentials (change in production)
ADMIN_EMAIL=EMAIL
ADMIN_PASSWORD=Password

# Other Configurations
NODE_ENV=development
MFA_ISSUER=SecureVaultPro

```

3. Start Server
```bash
npm start
```

## Tech Stack
- Node.js
- Express.js
- MongoDB
- @simplewebauthn/server
- Winston (for logging)

## Features
- FIDO2 WebAuthn implementation
- Admin authentication with MFA
- Security key management
- Audit logging
- User management
- Error handling and logging

## Startup
[Admin Startup](http://localhost/startup)

## Repository
[Backend Repository](https://github.com/Gauripatole11/backedn)