import { Router } from 'express';
import {
  forgotPassword,
  getEmailConfigStatus,
  login,
  requestRegisterOtp,
  resetPassword,
  verifyRegisterOtp,
  verifyResetCode,
} from '../controllers/auth.controller';

const authRouter = Router();

authRouter.get('/email-config', getEmailConfigStatus);
authRouter.post('/register/request-otp', requestRegisterOtp);
authRouter.post('/register/verify-otp', verifyRegisterOtp);
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/verify-reset-code', verifyResetCode);
authRouter.post('/reset-password', resetPassword);

export default authRouter;
