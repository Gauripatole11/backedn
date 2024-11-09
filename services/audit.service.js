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
  },

  createAuditLogStream(filters = {}) {
    const query = this._buildAuditQuery(filters);
    
    const transform = new Transform({
      objectMode: true,
      transform(log, encoding, callback) {
        const csvLine = [
          log.timestamp.toISOString(),
          log.action,
          log.performedBy?.email || 'System',
          log.resourceId || '',
          log.targetUserId || '',
          JSON.stringify(log.details || {}),
          log.ipAddress || ''
        ].join(',');
        
        callback(null, csvLine + '\n');
      }
    });

    const header = 'Timestamp,Action,PerformedBy,ResourceId,TargetUser,Details,IPAddress\n';
    transform.push(header);

    return AuditLog.find(query)
      .populate('performedBy', 'email')
      .cursor()
      .pipe(transform);
  },

  async getAuditLogs(filters = {}) {
    const query = this._buildAuditQuery(filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'email firstName lastName')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async getRecentActivity(limit = 10) {
    return AuditLog.find()
      .populate('performedBy', 'email firstName lastName')
      .sort({ timestamp: -1 })
      .limit(limit);
  },

  _buildAuditQuery(filters) {
    const query = {};
    
    if (filters.startDate && filters.endDate) {
      query.timestamp = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.performedBy) {
      query.performedBy = filters.performedBy;
    }

    if (filters.resourceType) {
      query['details.resourceType'] = filters.resourceType;
    }

    return query;
  }
};

module.exports = auditService;