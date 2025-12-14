import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CustomRequest, CustomResponse, JwtPayload } from '../types/express';
import { config } from '../config';

const verifyToken = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.headers.authorization) {
    (res as CustomResponse).sendError(401, 'Unauthorized access: No token provided');
    return;
  }

  let token: string;
  if (req.headers.authorization.startsWith('Bearer ')) {
    [, token] = req.headers.authorization.split(' ');
  } else {
    token = req.headers.authorization;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    (res as CustomResponse).sendError(401, 'Unauthorized access: Invalid token');
  }
};

export default verifyToken;
