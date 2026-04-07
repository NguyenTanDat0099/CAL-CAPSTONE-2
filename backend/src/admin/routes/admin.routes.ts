import { Router } from 'express';
import {
  getAdminProfile,
  getAdminStats,
  getAllUsers,
} from '../controllers/admin.controller';

const adminRouter = Router();

adminRouter.get('/profile', getAdminProfile);
adminRouter.get('/stats', getAdminStats);
adminRouter.get('/users', getAllUsers);

export default adminRouter;