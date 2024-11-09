// controllers/admin.controller.js
const securityKeyService = require('../services/securityKey.service');
const auditService = require('../services/audit.service');
const { ApiError } = require('../utils/errors');
const { validate } = require('../utils/validators');

const adminController = {
  // Security Key Management
  async getAllKeys(req, res, next) {
    try {
      const {
        status,
        keyType,
        serialNumber,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      const filters = {
        status,
        keyType,
        serialNumber,
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: order === 'desc' ? -1 : 1 }
      };

      const keys = await securityKeyService.searchKeys(filters);
      const totalKeys = await securityKeyService.countKeys(filters);

      res.json({
        data: keys,
        pagination: {
          total: totalKeys,
          page: parseInt(page),
          pages: Math.ceil(totalKeys / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async getKeyDetails(req, res, next) {
    try {
      const { keyId } = req.params;
      const keyDetails = await securityKeyService.getKeyDetails(keyId);

      if (!keyDetails) {
        throw new ApiError(404, 'Security key not found');
      }

      res.json({ data: keyDetails });
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

  async registerBulkKeys(req, res, next) {
    try {
      const { keys } = req.body;

      if (!Array.isArray(keys) || keys.length === 0) {
        throw new ApiError(400, 'Invalid keys data provided');
      }

      const registeredKeys = await securityKeyService.registerBulkKeys(
        keys,
        req.user.id
      );

      res.status(201).json({
        data: registeredKeys,
        message: `Successfully registered ${registeredKeys.length} keys`
      });
    } catch (error) {
      next(error);
    }
  },

  async assignKey(req, res, next) {
    try {
      const { keyId, userId, expiryDate } = req.body;

      const assignment = await securityKeyService.assignKey({
        keyId,
        userId,
        assignedBy: req.user.id,
        expiryDate
      });

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
      const { keyId, reason } = req.body;

      const revocation = await securityKeyService.revokeKey({
        keyId,
        revokedBy: req.user.id,
        reason
      });

      res.json({
        data: revocation,
        message: 'Key revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Dashboard & Reports
  async getDashboardStats(req, res, next) {
    try {
      const stats = await securityKeyService.getDashboardStats();
      const recentActivity = await auditService.getRecentActivity(10);
      const expiringKeys = await securityKeyService.getExpiringKeys(30); // Next 30 days

      res.json({
        data: {
          stats,
          recentActivity,
          expiringKeys
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async generateInventoryReport(req, res, next) {
    try {
      const { format = 'json' } = req.query;
      const report = await securityKeyService.generateInventoryReport();

      if (format === 'csv') {
        const csv = await securityKeyService.generateInventoryCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
        return res.send(csv);
      }

      res.json({ data: report });
    } catch (error) {
      next(error);
    }
  },

  // Audit Logs
  async getAuditLogs(req, res, next) {
    try {
      const {
        startDate,
        endDate,
        action,
        userId,
        resourceId,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        startDate,
        endDate,
        action,
        userId,
        resourceId,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      const [logs, total] = await Promise.all([
        auditService.getAuditLogs(filters),
        auditService.countAuditLogs(filters)
      ]);

      res.json({
        data: logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async exportAuditLogs(req, res, next) {
    try {
      const { startDate, endDate, action } = req.query;

      const filters = {
        startDate,
        endDate,
        action
      };

      const stream = await auditService.exportAuditLogsAsStream(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminController;