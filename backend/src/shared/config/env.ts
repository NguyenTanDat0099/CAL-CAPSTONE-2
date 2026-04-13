import dotenv from 'dotenv';
dotenv.config();

export const config = {
  databaseHost: process.env.DATABASE_HOST || 'localhost',
  databaseUser: process.env.DATABASE_USER || 'root',
  databasePassword: process.env.DATABASE_PASSWORD || 'Nguyenhuy@0705',
  databaseName: process.env.DATABASE_NAME || 'calai',
  databasePort: parseInt(process.env.DATABASE_PORT || '3306'),
  // Thêm các config khác nếu cần (e.g., JWT secret, email, etc.)
};