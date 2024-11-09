// controllers/admin.controller.js
const securityKeyService = require('../services/securityKey.service');
const auditService = require('../services/audit.service');
const { validate } = require('../utils/validators');

const adminController = {
  // Security Key Management
  async getAllKeys(req, res, next) {
    try {
      const keys = await securityKeyService.searchKeys();
      res.json({
        data: keys
      });
    } catch (error) {
      next(error);
    }
  },


  async registerKey(req, res, next) {
    try {
      const keyData = req.body;
      const { errors, value } = validate.key.register(keyData);

      if (errors) {
        return res.status(400).json({
          status: 'error',
          errors
        });
      }

      const newKey = await securityKeyService.registerKey(value, req.user.id);

      await auditService.createAuditLog({
        action: 'KEY_REGISTERED',
        performedBy: req.user.id,
        resourceId: newKey._id,
        details: {
          serialNumber: newKey.serialNumber,
          keyType: newKey.keyType
        }
      });

      res.status(201).json({ data: newKey });
    } catch (error) {
      next(error);
    }
  },


  async assignKey(req, res, next) {
    try {
      const { keyId, email } = req.body;

      const assignment = await securityKeyService.assignKey(keyId,email, req.user.id);

      res.json({
        data: assignment,
        message: 'Key assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  async revokeKey(req, res, next) {
    try {
      const { keyId } = req.body;

      const revocation = await securityKeyService.revokeKey(
        keyId,
        req.user.id,
      );

      res.json({
        data: revocation,
        message: 'Key revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  },


};

module.exports = adminController;