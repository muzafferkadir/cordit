import { Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        role: string;
      };
    }

    interface Response {
      sendError: (statusCode?: number, data?: unknown) => void;
      sendResponse: (statusCode?: number, data?: unknown) => void;
    }
  }
}

export interface CustomResponse extends Response {
  sendError: (statusCode?: number, data?: unknown) => void;
  sendResponse: (statusCode?: number, data?: unknown) => void;
}

export interface CustomRequest extends Request {
  user?: {
    username: string;
    role: string;
  };
}

export interface JwtPayload {
  username: string;
  role: string;
}
