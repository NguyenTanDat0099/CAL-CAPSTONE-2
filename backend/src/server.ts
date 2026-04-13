import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initializeAuthData } from './auth/services/auth.service';
import { testDatabaseConnection } from './shared/database/db';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await testDatabaseConnection();
  await initializeAuthData();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
