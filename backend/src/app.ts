import cors from 'cors';
import express from 'express';
import authRouter from './auth/routes/auth.routes';
import { requireAuth } from './shared/middleware/auth.middleware';
import { requireRole } from './shared/middleware/role.middleware';
import userRouter from './user/routes/user.routes';
import adminRouter from './admin/routes/admin.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', requireAuth, requireRole('user'), userRouter);
app.use('/api/admin', requireAuth, requireRole('admin'), adminRouter);

export default app;
