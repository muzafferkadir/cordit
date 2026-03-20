import Joi from 'joi';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const requestUpload = Joi.object({
  fileName: Joi.string().required().max(255),
  mimeType: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!ALLOWED_MIME_PREFIXES.some((prefix) => value.startsWith(prefix))) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': 'Only image, video, and audio files are allowed',
    }),
  fileSize: Joi.number().required().min(1).max(MAX_FILE_SIZE).messages({
    'number.max': `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  }),
});
