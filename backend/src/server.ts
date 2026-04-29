import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initializeAuthData } from './auth/services/auth.service';
import { testDatabaseConnection } from './shared/database/db';
import { initializeUserServices } from './user/services/user.service';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await testDatabaseConnection();
  await initializeAuthData(); // Create auth tables (accounts, roles, users) FIRST
  await initializeUserServices(); // Then create user module tables

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
