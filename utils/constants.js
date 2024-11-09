module.exports = {
    // HTTP Status codes
    STATUS_CODES: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_ERROR: 500
    },

    // User roles
    ROLES: {
        ADMIN: 'admin',
        USER: 'user',
        MANAGER: 'manager'
    },

    // Security key statuses
    KEY_STATUS: {
        AVAILABLE: 'available',
        ASSIGNED: 'assigned',
        LOST: 'lost',
        DAMAGED: 'damaged',
        DECOMMISSIONED: 'decommissioned'
    },

    // Audit action types
    AUDIT_ACTIONS: {
        KEY_REGISTERED: 'KEY_REGISTERED',
        KEY_ASSIGNED: 'KEY_ASSIGNED',
        KEY_REVOKED: 'KEY_REVOKED',
        USER_CREATED: 'USER_CREATED',
        USER_UPDATED: 'USER_UPDATED',
        LOGIN_SUCCESS: 'LOGIN_SUCCESS',
        LOGIN_FAILED: 'LOGIN_FAILED',
        MFA_ENABLED: 'MFA_ENABLED',
        MFA_VERIFIED: 'MFA_VERIFIED'
    }
};



