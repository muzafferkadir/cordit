import Joi from 'joi';

export const createInviteCode = Joi.object({
  expiresInHours: Joi.number().min(1).max(168).default(1),
  maxUses: Joi.number().min(1).max(100).default(1),
});

export const register = Joi.object({
  username: Joi.string().required().min(3).max(30),
  password: Joi.string().required().min(6).max(30),
  inviteCode: Joi.string().required().length(8),
});
