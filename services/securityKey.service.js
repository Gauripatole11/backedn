// services/securityKey.service.js
const SecurityKey = require('../models/securityKeys.model');
const AuditLog = require('../models/auditLog.model');
const KeyAssignment = require('../models/keyAssignment.model');
const ApiError = require('../utils/errors');
const User = require('../models/user.model');
const auditService = require('./audit.service');

const securityKeyService = {
  // Register a new security key
  async registerKey(keyData, registeredBy) {
    const key = new SecurityKey({
      ...keyData,
      createdBy: registeredBy,
      activationDate: new Date()
    });

    await key.save();

    await AuditLog.create({
      action: 'KEY_REGISTERED',
      performedBy: registeredBy,
      resourceId: key._id,
      details: {
        serialNumber: key.serialNumber,
        keyType: key.keyType
      }
    });

    return key;
  },


  // Search keys with filters
  async searchKeys() {
    return SecurityKey.find()
      .populate({
        path: 'currentAssignment',
        model: 'KeyAssignment',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'email firstName lastName'  // Select specific fields
        }
      })
      .sort({ createdAt: -1 });
  },

  async revokeKey(keyId,revokedBy) {
    try {

      const securityKey = await SecurityKey.findById(keyId);

      if (!securityKey) {
        throw new ApiError(400, 'No security key');
      }
      const activeAssignments = await KeyAssignment.findByIdAndDelete(securityKey.currentAssignment);
      securityKey.currentAssignment = undefined;
      securityKey.status = "available";
      securityKey.userHandle = undefined;
      securityKey.revokedAt= Date.now();
      securityKey.revokedBy = revokedBy;
      await securityKey.save();

      await auditService.createAuditLog({
        action: 'KEY_REVOKED',
        performedBy: revokedBy,
        resourceId: securityKey._id,
        details: {
          assignmentId: securityKey.currentAssignment,
          timestamp: new Date()
        }
      });
      return true;
    } catch (error) {
      throw new ApiError(500, 'Error generating authentication options: ' + error.message);
    }
  },


  async assignKey(keyId, email, assignedBy) {
    try {

      const securityKey = await SecurityKey.findById(keyId);

      if (!securityKey) {
        throw new ApiError(400, 'No security key');
      }

      const user = await User.findOne({
        email: email
      });

      if (!user) {
        throw new ApiError(400, 'No user');
      }
      const assignment = await securityKey.assign(user._id, assignedBy);

      await auditService.createAuditLog({
        action: 'KEY_ASSIGNED',
        performedBy: assignedBy,
        resourceId: securityKey._id,
        details: {
          assignmentId: assignment._id,
          timestamp: new Date()
        }
      });
      return assignment;
    } catch (error) {
      throw new ApiError(500, 'Error generating authentication options: ' + error.message);
    }
  },




};

module.exports = securityKeyService;