// controllers/admin.controller.js
const securityKeyService = require('../services/securityKey.service');
const auditService = require('../services/audit.service');

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