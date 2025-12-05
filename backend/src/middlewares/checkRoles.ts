import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/express';

type UserRole = 'admin' | 'user';

const checkRoles = (...allowedRoles: UserRole[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.sendError(401, 'Unauthorized: User role not found');
      return;
    }

    if (!allowedRoles.includes(userRole as UserRole)) {
      res.sendError(403, 'Forbidden: Insufficient permissions');
      return;
    }

    next();
  };
};

export default checkRoles;
