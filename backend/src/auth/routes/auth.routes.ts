import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  forgotPassword,
  getEmailConfigStatus,
  getValidateToken,
  login,
  requestRegisterOtp,
  resetPassword,
  verifyRegisterOtp,
  verifyResetCode,
} from '../controllers/auth.controller';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'TOO_MANY_LOGIN_ATTEMPTS' },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'TOO_MANY_OTP_REQUESTS' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'TOO_MANY_OTP_ATTEMPTS' },
});

const validateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'TOO_MANY_VALIDATE_REQUESTS' },
});

const authRouter = Router();

authRouter.get('/email-config', getEmailConfigStatus);
authRouter.post('/register/request-otp', otpLimiter, requestRegisterOtp);
authRouter.post('/register/verify-otp', otpVerifyLimiter, verifyRegisterOtp);
authRouter.post('/login', loginLimiter, login);
authRouter.post('/validate', validateLimiter, getValidateToken);
authRouter.post('/forgot-password', otpLimiter, forgotPassword);
authRouter.post('/verify-reset-code', otpVerifyLimiter, verifyResetCode);
authRouter.post('/reset-password', otpVerifyLimiter, resetPassword);

export default authRouter;
