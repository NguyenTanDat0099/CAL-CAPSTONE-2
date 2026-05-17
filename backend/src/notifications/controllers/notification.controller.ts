import { Request, Response } from 'express';
import {
  countUnread,
  getUserIdByAccountId,
  listRecentJobRuns,
  listUserNotifications,
  markAllAsRead,
  markAsRead,
  NotificationRow,
} from '../services/notification.service';
import { listJobNames, triggerJobManually } from '../jobs';

const resolveUserId = async (req: Request): Promise<number | null> => {
  const accountId = req.auth?.accountId;
  if (!accountId) return null;
  return getUserIdByAccountId(accountId);
};

const serialize = (row: NotificationRow) => ({
  id: row.notification_id,
  type: row.type,
  title: row.title,
  message: row.message,
  data: typeof row.data === 'string' ? safeParse(row.data) : row.data,
  isRead: row.is_read === 1,
  sentAt: row.sent_at,
  readAt: row.read_at,
});

const safeParse = (s: string | null): unknown => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

export const getMyNotifications = async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(404).json({ message: 'USER_NOT_FOUND' });

  const limit = Number(req.query.limit) || 30;
  const unreadOnly = req.query.unread === 'true' || req.query.unread === '1';

  const rows = await listUserNotifications(userId, { limit, unreadOnly });
  const unread = await countUnread(userId);
  res.json({
    notifications: rows.map(serialize),
    unreadCount: unread,
  });
};

export const markOneRead = async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(404).json({ message: 'USER_NOT_FOUND' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: 'INVALID_ID' });
  }
  const ok = await markAsRead(id, userId);
  res.json({ updated: ok });
};

export const markAllRead = async (req: Request, res: Response) => {
  const userId = await resolveUserId(req);
  if (!userId) return res.status(404).json({ message: 'USER_NOT_FOUND' });

  const count = await markAllAsRead(userId);
  res.json({ updated: count });
};

// ── Admin debug endpoints (mounted under /api/admin) ───────────────

export const adminListJobRuns = async (_req: Request, res: Response) => {
  const runs = await listRecentJobRuns(50);
  res.json({ jobs: listJobNames(), runs });
};

export const adminTriggerJob = async (req: Request, res: Response) => {
  const name = String(req.params.name || '');
  try {
    await triggerJobManually(name);
    res.json({ triggered: name });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ message });
  }
};
