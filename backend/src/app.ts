import cors from 'cors';
import express from 'express';
import authRouter from './auth/routes/auth.routes';
import { requireAuth } from './shared/middleware/auth.middleware';
import { requireRole } from './shared/middleware/role.middleware';
import userRouter from './user/routes/user.routes';
import adminRouter from './admin/routes/admin.routes';
import chatRouter from './chat/routes/chat.routes';
import {
  notificationAdminRouter,
  notificationUserRouter,
} from './notifications/routes/notification.routes';

const app = express();

// Trust the first proxy hop so express-rate-limit reads the real client IP from
// X-Forwarded-For when running behind ngrok/Cloudflare. Required by express-rate-limit v7.
app.set('trust proxy', 1);

const corsOptions = {
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    /https:\/\/.*\.ngrok(-free)?\.app$/,
    /https:\/\/.*\.ngrok\.io$/,
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '8mb' }));

app.get('/', (req, res) => {
    res.status(200).json({ message: 'CalAI Backend is running' });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is running' });
});

app.use('/api/auth', authRouter);
app.use(
  '/api/users/notifications',
  requireAuth,
  requireRole('user'),
  notificationUserRouter
);
app.use('/api/users', requireAuth, requireRole('user'), userRouter);
app.use(
  '/api/admin/notifications',
  requireAuth,
  requireRole('admin'),
  notificationAdminRouter
);
app.use('/api/admin', requireAuth, requireRole('admin'), adminRouter);
app.use('/api/chat', requireAuth, requireRole('user'), chatRouter);

export default app;
