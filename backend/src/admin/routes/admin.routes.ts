import { Router } from 'express';
import {
  getAdminProfile,
  getAdminStats,
  getAllUsers,
  getUserById,
  getUserStatistics,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  bulkUpdateUserStatus,
} from '../controllers/admin.controller';

const adminRouter = Router();

// ─── Profile & Stats ───
adminRouter.get('/profile', getAdminProfile);
adminRouter.get('/stats', getAdminStats);

// ─── User Management ───
adminRouter.get('/users', getAllUsers);
adminRouter.get('/users/:userId', getUserById);
adminRouter.get('/users/:userId/statistics', getUserStatistics);
adminRouter.post('/users', createUser);
adminRouter.put('/users/:userId', updateUser);
adminRouter.patch('/users/:userId/status', updateUserStatus);
adminRouter.delete('/users/:userId', deleteUser);
adminRouter.post('/users/bulk-status', bulkUpdateUserStatus);

export default adminRouter;
