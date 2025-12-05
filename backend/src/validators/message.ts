import Joi from 'joi';

export const sendMessage = Joi.object({
  roomId: Joi.string().required(),
  text: Joi.string().required().min(1).max(2000),
});

export const getMessages = Joi.object({
  roomId: Joi.string().required(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(50),
});

export const deleteMessage = Joi.object({
  messageId: Joi.string().required(),
});
