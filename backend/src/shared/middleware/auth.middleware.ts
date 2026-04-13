import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'calai-dev-secret';

interface AuthTokenPayload {
  accountId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      message: 'UNAUTHORIZED',
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    req.auth = {
      accountId: payload.accountId,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({
      message: 'INVALID_TOKEN',
    });
  }
};
