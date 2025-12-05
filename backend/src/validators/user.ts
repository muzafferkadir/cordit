import Joi from 'joi';

export const login = Joi.object({
  username: Joi.string().required().min(3).max(30),
  password: Joi.string().required().min(6).max(30),
});

export const register = Joi.object({
  username: Joi.string().required().min(3).max(30),
  password: Joi.string().required().min(6).max(30),
  inviteCode: Joi.string().required().length(8),
});
