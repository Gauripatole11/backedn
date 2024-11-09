const User = require('../models/user.model');
const ApiError = require('../utils/errors');
const { ROLES } = require('../utils/constants');
const bcrypt = require('bcryptjs');
const auditService = require('./audit.service');

const userService = {
  async createUser(userData, createdBy) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = new User({
      ...userData,
      password: hashedPassword,
      createdBy
    });

    await user.save();

    await auditService.createAuditLog({
      action: 'USER_CREATED',
      performedBy: createdBy,
      targetUserId: user._id,
      details: {
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

    return this.sanitizeUser(user);
  },

  async updateUser(userId, updateData, updatedBy) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Prevent role escalation
    if (updateData.role && !this.canChangeRole(updatedBy, updateData.role)) {
      throw new ApiError(403, 'Insufficient permissions to change role');
    }

    // Handle password update separately
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(user, updateData);
    await user.save();

    await auditService.createAuditLog({
      action: 'USER_UPDATED',
      performedBy: updatedBy,
      targetUserId: userId,
      details: {
        updatedFields: Object.keys(updateData)
      }
    });

    return this.sanitizeUser(user);
  },

  async getUsers(filters = {}) {
    const query = {};
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.search) {
      query.$or = [
        { email: new RegExp(filters.search, 'i') },
        { firstName: new RegExp(filters.search, 'i') },
        { lastName: new RegExp(filters.search, 'i') }
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query)
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async getUserById(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  },

  async deactivateUser(userId, deactivatedBy, reason) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role === ROLES.ADMIN) {
      throw new ApiError(403, 'Cannot deactivate admin user');
    }

    user.status = 'inactive';
    user.deactivationReason = reason;
    user.deactivatedAt = new Date();
    user.deactivatedBy = deactivatedBy;

    await user.save();

    await auditService.createAuditLog({
      action: 'USER_DEACTIVATED',
      performedBy: deactivatedBy,
      targetUserId: userId,
      details: { reason }
    });

    return this.sanitizeUser(user);
  },

  canChangeRole(updatingUser, newRole) {
    // Only admins can create other admins
    if (newRole === ROLES.ADMIN) {
      return updatingUser.role === ROLES.ADMIN;
    }
    // Admins and managers can create/modify regular users
    return [ROLES.ADMIN, ROLES.MANAGER].includes(updatingUser.role);
  },

  sanitizeUser(user) {
    if (!user) return null;
    const userObject = user.toObject();
    delete userObject.password;
    return userObject;
  },

  async getUserStats() {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    const totalUsers = stats.reduce((acc, curr) => acc + curr.count, 0);
    const activeUsers = stats.reduce((acc, curr) => acc + curr.active, 0);

    return {
      total: totalUsers,
      active: activeUsers,
      byRole: stats
    };
  }
};

module.exports = userService;