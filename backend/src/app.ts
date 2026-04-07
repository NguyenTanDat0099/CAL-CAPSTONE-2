import cors from 'cors';
import express from 'express';
import userRouter from './user/routes/user.routes';
import adminRouter from './admin/routes/admin.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Backend is running' });
});

app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);

export default app;
