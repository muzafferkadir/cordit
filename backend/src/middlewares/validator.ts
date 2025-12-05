import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { CustomResponse } from '../types/express';

type PropertyType = 'body' | 'query' | 'params';

const validator = (schema: ObjectSchema, property: PropertyType = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.validate(req[property], { abortEarly: false });

      if (result.error) {
        const { details } = result.error;
        const message = details.map((i) => ({
          message: i.message.replace(/['"]/g, "'"),
          field: i?.context?.label || i?.context?.key,
        }));
        (res as CustomResponse).sendError(422, message);
      } else {
        next();
      }
    } catch (error) {
      (res as CustomResponse).sendError(500, error);
    }
  };
};

export default validator;
