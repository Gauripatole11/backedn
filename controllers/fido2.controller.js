// controllers/fido2.controller.js
const User = require('../models/user.model');
const Fido2Service = require('../services/fido2.service');
const ApiError = require('../utils/errors');
const jwt = require('jsonwebtoken')
const fido2Controller = {

  register: async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, employeeId, department } = req.body;
      const existingUser = await User.findOne({
        $or: [{ email }, { employeeId }]
      });

      if (existingUser) {
        throw new ApiError(401, 'Email or Employee ID already registered');
      }

      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        employeeId,
        department
      });

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            employeeId: user.employeeId,
            department: user.department
          }
        }
      });
    }
    catch (error) {
      next(error);
    }
  },

  // Start FIDO2 Registration (after user is created)
  async startFidoRegistration(req, res, next) {
    try {
      const { email } = req.body;
      const user = await User.findOne({
        email
      });

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const options = await Fido2Service.generateRegistrationOptions({
        id: user._id.toString(),
        name: user.email,
        displayName: `${user.firstName} ${user.lastName}`
      });

      res.json({
        status: 'success',
        data: {
          options,
          userId: user._id
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Complete FIDO2 Registration
  async completeFidoRegistration(req, res, next) {
    try {
      const { attestationResponse, userId } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const verification = await Fido2Service.verifyRegistration(
        attestationResponse,
        userId
      );

      user.fidoRegistered = true;
      await user.save();

      res.json({
        status: 'success',
        message: 'Security key registered successfully',
        data: {
          credentialID: verification.credentialId
        }
      });
    }
    catch (error) {
      next(error);
    }
  },

  // Complete FIDO2 Authentication
  async loginBegin(req, res, next) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      const options = await Fido2Service.generateAuthenticationOptions(user._id);
      res.json({
        status: 'success',
        data: {
          options,
          userId: user._id
        }
      });
    }
    catch (error) {
      next(error);
    }
  },

  // Complete FIDO2 Authentication
  async loginComplete(req, res, next) {
    try {
      const { assertionResponse, email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const verification = await Fido2Service.verifyAuthentication(
        assertionResponse,
        user._id
      );

      if (!verification) {
        throw new ApiError(401, 'Authentication failed');
      }

      user.lastLogin = new Date();
      await user.save();

      let payload = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        status: 'success',
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department
          }
        }
      });
    }
    catch (error) {
      next(error);
    }
  }

};

module.exports = fido2Controller;