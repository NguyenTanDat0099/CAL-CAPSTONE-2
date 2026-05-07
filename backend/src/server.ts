import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initializeAuthData } from './auth/services/auth.service';
import { testDatabaseConnection } from './shared/database/db';
import { initializeUserServices } from './user/services/user.service';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await testDatabaseConnection();
    await initializeAuthData();
    await initializeUserServices();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
