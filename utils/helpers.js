const crypto = require('crypto');
  
  const helpers = {
    generateRandomString: (length = 32) => {
      return crypto.randomBytes(length).toString('hex');
    },
  
    generateApiKey: () => {
      return `sk_${crypto.randomBytes(24).toString('hex')}`;
    },
  
    sanitizeUser: (user) => {
      if (!user) return null;
      const { password, ...sanitizedUser } = user.toObject();
      return sanitizedUser;
    },
  
    formatDate: (date) => {
      return new Date(date).toISOString();
    },
  
    validateEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
  
    maskSensitiveData: (data) => {
      if (typeof data !== 'string') return data;
      return data.replace(/[0-9]/g, '*');
    }
  };
  
  module.exports = helpers;