import { Router } from 'express';
import {
  adminListJobRuns,
  adminTriggerJob,
  deleteOne,
  getMyNotifications,
  markAllRead,
  markOneRead,
} from '../controllers/notification.controller';

// Routes for end-users — mounted under /api/users/notifications.
export const notificationUserRouter = Router();
notificationUserRouter.get('/', getMyNotifications);
notificationUserRouter.patch('/:id/read', markOneRead);
notificationUserRouter.post('/mark-all-read', markAllRead);
notificationUserRouter.delete('/:id', deleteOne);

// Admin debug routes — mounted under /api/admin/notifications.
export const notificationAdminRouter = Router();
notificationAdminRouter.get('/runs', adminListJobRuns);
notificationAdminRouter.post('/trigger/:name', adminTriggerJob);
