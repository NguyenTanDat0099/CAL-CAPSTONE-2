import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accountId: number;
        email: string;
        role: string;
      };
    }
  }
}

export {};
