// services/securityKey.service.js
const SecurityKey = require('../models/securityKeys.model');
const AuditLog = require('../models/auditLog.model');

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

  async countKeys(filters = {}) {
    try {
      const query = this._buildFilterQuery(filters);
      return await SecurityKey.countDocuments(query);
    } catch (error) {
      throw new Error(`Error counting keys: ${error.message}`);
    }
  },

  // Helper method to build filter query
  _buildFilterQuery(filters) {
    const query = {};

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Key type filter
    if (filters.keyType) {
      query.keyType = filters.keyType;
    }

    // Search by serial number or nickname
    if (filters.search) {
      query.$or = [
        { serialNumber: new RegExp(filters.search, 'i') },
        { nickname: new RegExp(filters.search, 'i') }
      ];
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    return query;
  },

  // Get key with full assignment history
  async getKeyDetails(keyId) {
    return SecurityKey.findById(keyId)
      .populate({
        path: 'currentAssignment',
        model: 'KeyAssignment',
        populate: {
          path: 'userId',
          model: 'User',
          select: 'email firstName lastName'  // Select specific fields
        }
      })
      .populate('assignmentHistory')
      .populate('createdBy', 'email firstName lastName')
      .populate('updatedBy', 'email firstName lastName');
  },

  // Bulk key registration
  async registerBulkKeys(keysData, registeredBy) {
    const keys = keysData.map(keyData => ({
      ...keyData,
      createdBy: registeredBy,
      activationDate: new Date()
    }));

    const registeredKeys = await SecurityKey.insertMany(keys);

    // Bulk create audit logs
    const auditLogs = registeredKeys.map(key => ({
      action: 'KEY_REGISTERED',
      performedBy: registeredBy,
      resourceId: key._id,
      details: {
        serialNumber: key.serialNumber,
        keyType: key.keyType,
        bulkRegistration: true
      }
    }));

    await AuditLog.insertMany(auditLogs);

    return registeredKeys;
  },

  // Search keys with filters
  async searchKeys(filters) {
    const query = this._buildFilterQuery(filters);


    return SecurityKey.find(query)
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

  // Generate key inventory report
  async generateInventoryReport() {
    const stats = await SecurityKey.aggregate([
      {
        $group: {
          _id: {
            status: '$status',
            keyType: '$keyType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.status',
          types: {
            $push: {
              type: '$_id.keyType',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ]);

    const expiringKeys = await SecurityKey.findExpiringSoon();

    return {
      inventory: stats,
      expiringKeys,
      totalKeys: await SecurityKey.countDocuments(),
      lastUpdated: new Date()
    };
  }
};

module.exports = securityKeyService;