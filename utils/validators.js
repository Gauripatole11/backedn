// utils/validators.js
const Joi = require('joi');

// Common validation patterns
const patterns = {
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    serialNumber: /^[A-Z0-9]{6,}$/,
    employeeId: /^EMP\d{5}$/
};

// Custom error messages
const messages = {
    'string.password': 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
    'string.email': 'Please enter a valid email address',
    'any.required': '{#label} is required',
    'string.empty': '{#label} cannot be empty'
};

// Common validation schemas
const validators = {
    // User Validation Schemas
    userSchema: {
        register: Joi.object({
            email: Joi.string()
                .email()
                .required()
                .messages(messages),
            password: Joi.string()
                .pattern(patterns.password)
                .messages(messages),
            firstName: Joi.string()
                .min(2)
                .max(50)
                .required(),
            lastName: Joi.string()
                .min(2)
                .max(50)
                .required(),
            employeeId: Joi.string()
                .pattern(patterns.employeeId)
                .required(),
            department: Joi.string()
                .required()
        }),

        login: Joi.object({
            email: Joi.string()
                .email()
                .required(),
            password: Joi.string()
                .required(),
            mfaCode: Joi.string()
        })
    },

    // Security Key Validation Schemas
    keySchema: {
        register: Joi.object({
            serialNumber: Joi.string()
                .pattern(patterns.serialNumber)
                .required()
                .messages({
                    'string.pattern.base': 'Serial number must be at least 6 characters long and contain only uppercase letters and numbers'
                }),
            nickname: Joi.string()
                .max(50)
                .optional(),
            keyType: Joi.string()
                .valid('FIDO2', 'FIDO_U2F', 'TOTP', 'HOTP')
                .required(),
            manufacturer: Joi.string()
                .default('FEITIAN'),
            location: Joi.string()
                .optional(),
            notes: Joi.string()
                .max(500)
                .optional()
        }),

        assign: Joi.object({
            userId: Joi.string()
                .regex(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid user ID format'
                }),
            keyId: Joi.string()
                .regex(/^[0-9a-fA-F]{24}$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid key ID format'
                }),
            expiryDate: Joi.date()
                .greater('now')
                .optional(),
            notes: Joi.string()
                .max(500)
                .optional()
        })
    },

    // Query Parameter Validation
    querySchema: {
        pagination: Joi.object({
            page: Joi.number()
                .integer()
                .min(1)
                .default(1),
            limit: Joi.number()
                .integer()
                .min(1)
                .max(100)
                .default(10),
            sortBy: Joi.string()
                .valid('createdAt', 'updatedAt', 'serialNumber', 'status')
                .default('createdAt'),
            order: Joi.string()
                .valid('asc', 'desc')
                .default('desc')
        }),

        dateRange: Joi.object({
            startDate: Joi.date()
                .iso()
                .required(),
            endDate: Joi.date()
                .iso()
                .min(Joi.ref('startDate'))
                .required()
        })
    },



    fido: {
        completeRegistration: Joi.object({
            attestationResponse: Joi.object({
                id: Joi.string().required(),
                rawId: Joi.string().required(),
                response: Joi.object({
                    clientDataJSON: Joi.string().required(),
                    attestationObject: Joi.string().required()
                }).required(),
                type: Joi.string().valid('public-key').required()
            }).required()
        }),


        completeAuthentication: Joi.object({
            assertionResponse: Joi.object({
                id: Joi.string().required(),
                rawId: Joi.string().required(),
                response: Joi.object({
                    clientDataJSON: Joi.string().required(),
                    authenticatorData: Joi.string().required(),
                    signature: Joi.string().required(),
                    userHandle: Joi.string().allow(null, '')
                }).required(),
                type: Joi.string().valid('public-key').required()
            }).required()
        })
    }


};

// Validation helper functions
const validateRequest = (schema) => {
    return (data) => {
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            return { errors };
        }

        return { value };
    };
};

// Export all validators and helper functions
module.exports = {
    validateRequest,
    validate: {
        user: {
            register: validateRequest(validators.userSchema.register),
            login: validateRequest(validators.userSchema.login)
        },
        key: {
            register: validateRequest(validators.keySchema.register),
            assign: validateRequest(validators.keySchema.assign)
        },
        query: {
            pagination: validateRequest(validators.querySchema.pagination),
            dateRange: validateRequest(validators.querySchema.dateRange)
        },
        fido: {
            completeRegistration: validateRequest(validators.fido.completeRegistration),
            completeAuthentication: validateRequest(validators.fido.completeAuthentication)
        }
    },
    patterns,
    messages
};