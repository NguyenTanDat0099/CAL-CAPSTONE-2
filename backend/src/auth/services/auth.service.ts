import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../../shared/database/db';
import { emailSenderConfigured, sendOtpEmail } from '../../shared/email/mailer';
import { jwtSecret, jwtExpiresIn } from '../../shared/config/jwt';
import { createAdminNotifications } from '../../notifications/services/notification.service';

interface AccountRow {
  account_id: number;
  email: string;
  password_hash: string | null;
  email_verified: number | null;
  status: string | null;
}

interface RegisterOtpPayload {
  email: string;
  password: string;
  username: string;
}

interface VerifyRegisterOtpPayload {
  email: string;
  code: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface VerifyResetCodePayload {
  email: string;
  code: string;
}

interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

const resetCodes = new Map<string, { code: string; expiresAt: number }>();
const registerOtps = new Map<string, { code: string; expiresAt: number; password: string; username: string }>();

const USER_ROLE = 'user';
const ADMIN_ROLE = 'admin';
let authSchemaInitPromise: Promise<void> | null = null;

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password: string, storedHash: string | null) => {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedKey, 'hex'));
};

const normalizeRole = (roleName: string | null | undefined) => (roleName || USER_ROLE).toLowerCase();
const normalizeStatus = (status: string | null | undefined) => (status || 'active').toLowerCase();
const createAuthToken = (accountId: number, email: string, role: string) =>
  jwt.sign({ accountId, email, role }, jwtSecret, { expiresIn: jwtExpiresIn });

const initializeAuthSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      email_verified TINYINT DEFAULT 0,
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      role_id INT AUTO_INCREMENT PRIMARY KEY,
      role_name VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      account_id INT NOT NULL UNIQUE,
      full_name VARCHAR(255),
      gender ENUM('male', 'female', 'other') DEFAULT 'other',
      age INT,
      height DECIMAL(5,2),
      weight DECIMAL(5,2),
      has_completed_setup TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
      INDEX idx_account (account_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS accountroles (
      account_id INT NOT NULL,
      role_id INT NOT NULL,
      PRIMARY KEY (account_id, role_id),
      FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
    )
  `);
};

const ensureAuthSchema = async () => {
  if (!authSchemaInitPromise) {
    authSchemaInitPromise = initializeAuthSchema();
  }

  await authSchemaInitPromise;
};

const ensureRole = async (roleName: string) => {
  const [rows] = await pool.query('SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1', [roleName]);
  const existing = rows as Array<{ role_id: number }>;

  if (existing.length > 0) {
    return existing[0].role_id;
  }

  const [insertResult] = await pool.query('INSERT INTO roles (role_name) VALUES (?)', [roleName]);
  return (insertResult as { insertId: number }).insertId;
};

const getAccountWithRole = async (email: string) => {
  const [rows] = await pool.query(
    `
      SELECT
        a.account_id,
        a.email,
        a.password_hash,
        a.email_verified,
        a.status,
        r.role_name
      FROM accounts a
      LEFT JOIN accountroles ar ON ar.account_id = a.account_id
      LEFT JOIN roles r ON r.role_id = ar.role_id
      WHERE LOWER(a.email) = LOWER(?)
      LIMIT 1
    `,
    [email]
  );

  return (rows as Array<AccountRow & { role_name: string | null }>)[0] ?? null;
};

const ensureDemoAccounts = async () => {
  const userRoleId = await ensureRole(USER_ROLE);
  const adminRoleId = await ensureRole(ADMIN_ROLE);

  const demoAccounts = [
    { email: 'admin@calai.local', name: 'CalAI Admin', password: 'Admin123!', roleId: adminRoleId },
  ];

  for (const account of demoAccounts) {
    const existing = await getAccountWithRole(account.email);
    if (existing) {
      continue;
    }

    const [accountInsert] = await pool.query(
      `
        INSERT INTO accounts (email, password_hash, email_verified, status)
        VALUES (?, ?, ?, ?)
      `,
      [account.email, hashPassword(account.password), 1, 'active']
    );
    const accountId = (accountInsert as { insertId: number }).insertId;

    await pool.query('INSERT INTO accountroles (account_id, role_id) VALUES (?, ?)', [accountId, account.roleId]);

    // Create user record for ALL accounts (both user and admin)
    await pool.query(
      `
        INSERT INTO users (account_id, full_name, gender, age, height, weight)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [accountId, account.name, 'male', 22, 175, 70]
    );
  }
};

export const initializeAuthData = async () => {
  await ensureAuthSchema();
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_ACCOUNTS !== 'false') {
    await ensureDemoAccounts();
  }
};

export const requestRegisterOtpService = async ({ email, password, username }: RegisterOtpPayload) => {
  const existing = await getAccountWithRole(email);
  if (existing) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  if (!username || username.trim().length < 2) {
    throw new Error('INVALID_USERNAME');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  registerOtps.set(email.toLowerCase(), {
    code,
    password,
    username: username.trim(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const emailSent = await sendOtpEmail(email, 'CalAI Register OTP', 'Register verification code', code);

  return {
    email,
    expiresInMinutes: 10,
    emailSent,
    previewCode: emailSent ? undefined : code,
  };
};

export const verifyRegisterOtpService = async ({ email, code }: VerifyRegisterOtpPayload) => {
  const existing = await getAccountWithRole(email);
  if (existing) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const pending = registerOtps.get(email.toLowerCase());
  if (!pending || pending.expiresAt < Date.now() || pending.code !== code) {
    throw new Error('INVALID_REGISTER_OTP');
  }

  const roleId = await ensureRole(USER_ROLE);
  const [accountInsert] = await pool.query(
    `
      INSERT INTO accounts (email, password_hash, email_verified, status)
      VALUES (?, ?, ?, ?)
    `,
    [email, hashPassword(pending.password), 1, 'active']
  );
  const accountId = (accountInsert as { insertId: number }).insertId;

  await pool.query('INSERT INTO accountroles (account_id, role_id) VALUES (?, ?)', [accountId, roleId]);
  await pool.query(
    `
      INSERT INTO users (account_id, full_name, has_completed_setup)
      VALUES (?, ?, 0)
    `,
    [accountId, pending.username]
  );

  registerOtps.delete(email.toLowerCase());

  try {
    await createAdminNotifications({
      type: 'system',
      title: 'New user registered',
      message: `${pending.username} (${email}) registered a new account.`,
      data: { event: 'USER_REGISTERED', accountId, email, username: pending.username },
      dedupeKey: `user-registered:${accountId}`,
    });
  } catch (error) {
    console.error('[AdminNotification] Failed to notify new registration:', error);
  }

  return {
    accountId,
    email,
    role: USER_ROLE,
  };
};

export const loginService = async ({ email, password }: LoginPayload) => {
  const account = await getAccountWithRole(email);
  if (!account || !verifyPassword(password, account.password_hash)) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!account.email_verified) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  if (normalizeStatus(account.status) === 'suspended') {
    throw new Error('ACCOUNT_SUSPENDED');
  }

  return {
    accountId: account.account_id,
    email: account.email,
    role: normalizeRole(account.role_name),
    status: normalizeStatus(account.status),
    token: createAuthToken(account.account_id, account.email, normalizeRole(account.role_name)),
  };
};

export const forgotPasswordService = async ({ email }: ForgotPasswordPayload) => {
  const account = await getAccountWithRole(email);
  if (!account) {
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  resetCodes.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const emailSent = await sendOtpEmail(email, 'CalAI Reset Password OTP', 'Reset password verification code', code);

  return {
    email,
    expiresInMinutes: 10,
    emailSent,
    previewCode: emailSent ? undefined : code,
  };
};

export const getEmailConfigStatusService = () => ({
  configured: emailSenderConfigured,
});

export const verifyResetCodeService = async ({ email, code }: VerifyResetCodePayload) => {
  const stored = resetCodes.get(email.toLowerCase());
  if (!stored || stored.expiresAt < Date.now() || stored.code !== code) {
    throw new Error('INVALID_RESET_CODE');
  }

  return {
    email,
    verified: true,
  };
};

export const resetPasswordService = async ({ email, code, newPassword }: ResetPasswordPayload) => {
  const stored = resetCodes.get(email.toLowerCase());
  if (!stored || stored.expiresAt < Date.now() || stored.code !== code) {
    throw new Error('INVALID_RESET_CODE');
  }

  const account = await getAccountWithRole(email);
  if (!account) {
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  await pool.query('UPDATE accounts SET password_hash = ? WHERE account_id = ?', [
    hashPassword(newPassword),
    account.account_id,
  ]);

  resetCodes.delete(email.toLowerCase());

  return {
    accountId: account.account_id,
    email: account.email,
    role: normalizeRole(account.role_name),
    token: createAuthToken(account.account_id, account.email, normalizeRole(account.role_name)),
  };
};
