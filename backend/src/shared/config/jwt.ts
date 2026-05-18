import type { SignOptions } from 'jsonwebtoken';

const WEAK_PLACEHOLDERS = new Set([
  'calai-dev-secret',
  'your_long_random_secret_here',
  'changeme',
  'secret',
]);

const secret = process.env.JWT_SECRET;
if (!secret || WEAK_PLACEHOLDERS.has(secret) || secret.length < 32) {
  throw new Error(
    'JWT_SECRET is missing, uses a known placeholder, or is shorter than 32 chars. ' +
      'Set a strong random value in backend/.env before starting the server.'
  );
}

export const jwtSecret: string = secret;
export const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
