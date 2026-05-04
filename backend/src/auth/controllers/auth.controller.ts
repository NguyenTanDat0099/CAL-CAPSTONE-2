import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  forgotPasswordService,
  getEmailConfigStatusService,
  loginService,
  requestRegisterOtpService,
  resetPasswordService,
  verifyRegisterOtpService,
  verifyResetCodeService,
} from '../services/auth.service';

const jwtSecret = process.env.JWT_SECRET || 'calai-dev-secret';

interface AuthTokenPayload {
  accountId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const errorStatusMap: Record<string, number> = {
  EMAIL_ALREADY_EXISTS: 409,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  ACCOUNT_NOT_FOUND: 404,
  INVALID_RESET_CODE: 400,
  INVALID_REGISTER_OTP: 400,
  INVALID_USERNAME: 400,
};

const handleAuthError = (error: unknown, res: Response) => {
  const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  return res.status(errorStatusMap[message] ?? 500).json({
    message,
  });
};

export const requestRegisterOtp = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: 'email, username and password are required' });
    }

    if (username.trim().length < 2) {
      return res.status(400).json({ message: 'Username must be at least 2 characters' });
    }

    const data = await requestRegisterOtpService({ email, password, username: username.trim() });
    return res.status(200).json({
      message: 'Register OTP sent successfully',
      data,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const verifyRegisterOtp = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'email and code are required' });
    }

    const data = await verifyRegisterOtpService({ email, code });
    return res.status(201).json({
      message: 'Register successful',
      data,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const data = await loginService({ email, password });
    return res.status(200).json({
      message: 'Login successful',
      data,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const data = await forgotPasswordService({ email });
    return res.status(200).json({
      message: 'Confirmation code sent successfully',
      data,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'email and code are required' });
    }

    const data = await verifyResetCodeService({ email, code });
    return res.status(200).json({
      message: 'Code verified successfully',
      data,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'email, code and newPassword are required' });
    }

    const data = await resetPasswordService({ email, code, newPassword });
    return res.status(200).json({
      message: 'Password reset successful',
      data,
    });
  } catch (error) {
    return handleAuthError(error, res);
  }
};

export const getEmailConfigStatus = async (req: Request, res: Response) => {
  return res.status(200).json({
    message: 'Email configuration status fetched successfully',
    data: getEmailConfigStatusService(),
  });
};

export const getValidateToken = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      valid: false,
      message: 'NO_TOKEN',
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;
    return res.status(200).json({
      valid: true,
      data: {
        accountId: payload.accountId,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch {
    return res.status(401).json({
      valid: false,
      message: 'INVALID_TOKEN',
    });
  }
};
