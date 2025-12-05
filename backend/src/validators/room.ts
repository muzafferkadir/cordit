import Joi from 'joi';

export const createRoom = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().max(500),
  maxUsers: Joi.number().min(1).max(500),
});

export const updateRoom = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(500),
  maxUsers: Joi.number().min(1).max(500),
});

export const joinRoom = Joi.object({
  roomId: Joi.string().required(),
});

export const leaveRoom = Joi.object({
  roomId: Joi.string().required(),
});
