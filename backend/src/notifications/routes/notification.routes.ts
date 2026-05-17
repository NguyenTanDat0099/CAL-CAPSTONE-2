import { Router } from 'express';
import {
  adminListJobRuns,
  adminTriggerJob,
  getMyNotifications,
  markAllRead,
  markOneRead,
} from '../controllers/notification.controller';

// Routes for end-users — mounted under /api/users/notifications.
export const notificationUserRouter = Router();
notificationUserRouter.get('/', getMyNotifications);
notificationUserRouter.patch('/:id/read', markOneRead);
notificationUserRouter.post('/mark-all-read', markAllRead);

// Admin debug routes — mounted under /api/admin/notifications.
export const notificationAdminRouter = Router();
notificationAdminRouter.get('/runs', adminListJobRuns);
notificationAdminRouter.post('/trigger/:name', adminTriggerJob);
