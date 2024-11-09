const AuditLog = require('../models/auditLog.model');
const { Transform } = require('stream');

const auditService = {
  async createAuditLog(logData) {
    const log = new AuditLog({
      action: logData.action,
      performedBy: logData.performedBy,
      resourceId: logData.resourceId,
      targetUserId: logData.targetUserId,
      details: logData.details,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent
    });

    await log.save();
    return log;
  }
};

module.exports = auditService;