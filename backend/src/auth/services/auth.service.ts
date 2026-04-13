import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../../shared/database/db';
import { emailSenderConfigured, sendOtpEmail } from '../../shared/email/mailer';

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
const registerOtps = new Map<string, { code: string; expiresAt: number; password: string }>();

const USER_ROLE = 'user';
const ADMIN_ROLE = 'admin';
const jwtSecret = process.env.JWT_SECRET || 'calai-dev-secret';
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

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
const createAuthToken = (accountId: number, email: string, role: string) =>
  jwt.sign({ accountId, email, role }, jwtSecret, { expiresIn: jwtExpiresIn });

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
    { email: 'user@calai.local', password: 'User123!', roleId: userRoleId, name: 'CalAI User' },
    { email: 'admin@calai.local', password: 'Admin123!', roleId: adminRoleId, name: 'CalAI Admin' },
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
      [account.email, hashPassword(account.password), 1, 'ACTIVE']
    );
    const accountId = (accountInsert as { insertId: number }).insertId;

    await pool.query('INSERT INTO accountroles (account_id, role_id) VALUES (?, ?)', [accountId, account.roleId]);

    if (normalizeRole(account.roleId === adminRoleId ? ADMIN_ROLE : USER_ROLE) === USER_ROLE) {
      await pool.query(
        `
          INSERT INTO users (account_id, full_name, gender, date_of_birth, height, weight)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [accountId, account.name, 'male', '2003-09-09', 175, 70]
      );
    }
  }
};

export const initializeAuthData = async () => {
  await ensureDemoAccounts();
};

export const requestRegisterOtpService = async ({ email, password }: RegisterOtpPayload) => {
  const existing = await getAccountWithRole(email);
  if (existing) {
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  registerOtps.set(email.toLowerCase(), {
    code,
    password,
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
    [email, hashPassword(pending.password), 1, 'ACTIVE']
  );
  const accountId = (accountInsert as { insertId: number }).insertId;

  await pool.query('INSERT INTO accountroles (account_id, role_id) VALUES (?, ?)', [accountId, roleId]);
  await pool.query(
    `
      INSERT INTO users (account_id, full_name, gender, date_of_birth, height, weight)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [accountId, email.split('@')[0], 'male', '2003-09-09', 170, 65]
  );

  registerOtps.delete(email.toLowerCase());

  return {
    accountId,
    email,
    role: USER_ROLE,
  };
};

export const loginService = async ({ email, password }: LoginPayload) => {
  await ensureDemoAccounts();

  const account = await getAccountWithRole(email);
  if (!account || !verifyPassword(password, account.password_hash)) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!account.email_verified) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  return {
    accountId: account.account_id,
    email: account.email,
    role: normalizeRole(account.role_name),
    status: account.status ?? 'ACTIVE',
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
