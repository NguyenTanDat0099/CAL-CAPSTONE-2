import { Router } from 'express';
import {
  adminListJobRuns,
  adminTriggerJob,
  deleteAdminOne,
  deleteOne,
  getAdminNotifications,
  getMyNotifications,
  markAdminAllRead,
  markAdminOneRead,
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
notificationAdminRouter.get('/', getAdminNotifications);
notificationAdminRouter.patch('/:id/read', markAdminOneRead);
notificationAdminRouter.post('/mark-all-read', markAdminAllRead);
notificationAdminRouter.delete('/:id', deleteAdminOne);
notificationAdminRouter.get('/runs', adminListJobRuns);
notificationAdminRouter.post('/trigger/:name', adminTriggerJob);
