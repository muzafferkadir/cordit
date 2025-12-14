import Joi from 'joi';

export const mongoIdSchema = Joi.object({
    id: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid ID format',
            'any.required': 'ID is required',
        }),
});

export const inviteCodeSchema = Joi.object({
    code: Joi.string()
        .regex(/^[A-Z0-9]{8}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid invite code format',
            'any.required': 'Invite code is required',
        }),
});

export const sanitizeInput = (input: unknown): string => {
    if (typeof input !== 'string') {
        return '';
    }
    return input.replace(/[${}]/g, '');
};
