import { NextFunction, Request, Response } from 'express';

export const requireRole = (expectedRole: 'admin' | 'user') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: 'UNAUTHORIZED',
      });
    }

    if (req.auth.role !== expectedRole) {
      return res.status(403).json({
        message: 'FORBIDDEN',
      });
    }

    return next();
  };
};
