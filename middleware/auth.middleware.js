const jwt = require('jsonwebtoken');
const ApiError  = require('../utils/errors');
const { ROLES } = require('../utils/constants');
const User = require('../models/user.model');

const authMiddleware = {
  authenticateJWT: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new ApiError(401, 'No token provided');
      }


      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.userId).select('-password');
      console.log(user)

      if (!user || !user.status) {
        throw new ApiError(401, 'Invalid or inactive user');
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        next(new ApiError(401, 'Invalid token'));
      } else {
        next(error);
      }
    }
  },

  isAdmin: (req, res, next) => {
    if (req.user.role !== ROLES.ADMIN) {
      throw new ApiError(403, 'Admin access required');
    }
    next();
  },

  isManager: (req, res, next) => {
    if (![ROLES.ADMIN, ROLES.MANAGER].includes(req.user.role)) {
      throw new ApiError(403, 'Manager access required');
    }
    next();
  },

  addUser:(req,res,next)=>{
    next();
  }
};

module.exports = authMiddleware

