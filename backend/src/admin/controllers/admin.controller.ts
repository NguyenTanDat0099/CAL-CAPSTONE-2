import { Request, Response } from 'express';
import {
  getAdminProfileService,
  getAdminStatsService,
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  updateUserStatusService,
  deleteUserService,
  bulkUpdateUserStatusService,
  getUserStatisticsService,
  AdminServiceError,
} from '../services/admin.service';

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────
const handleError = (error: unknown, res: Response) => {
  if (error instanceof AdminServiceError) {
    return res.status(error.statusCode).json({ message: error.code, detail: error.message });
  }
  console.error('[AdminController] Unexpected error:', error);
  return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR' });
};

const parseIntParam = (value: unknown, defaultValue: number): number => {
  if (value === undefined || value === null) return defaultValue;
  const str = Array.isArray(value) ? String(value[0]) : String(value);
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// ──────────────────────────────────────────────
// Profile & Stats
// ──────────────────────────────────────────────
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    const adminId = req.auth?.accountId;
    const profile = await getAdminProfileService(adminId);
    res.status(200).json({ message: 'Admin profile fetched successfully', data: profile });
  } catch (error) {
    handleError(error, res);
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const stats = await getAdminStatsService();
    res.status(200).json({ message: 'Admin stats fetched successfully', data: stats });
  } catch (error) {
    handleError(error, res);
  }
};

// ──────────────────────────────────────────────
// User Management
// ──────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Query params: page, limit, status, search, sortBy, sortOrder
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 10);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
    const sortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder : undefined;

    const result = await getAllUsersService({ page, limit, status, search, sortBy, sortOrder });
    res.status(200).json({ message: 'Users fetched successfully', data: result });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * GET /api/admin/users/:userId
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId, 0);
    if (userId <= 0) {
      return res.status(400).json({ message: 'INVALID_USER_ID' });
    }
    const user = await getUserByIdService(userId);
    res.status(200).json({ message: 'User fetched successfully', data: user });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * GET /api/admin/users/:userId/statistics
 */
export const getUserStatistics = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId, 0);
    if (userId <= 0) {
      return res.status(400).json({ message: 'INVALID_USER_ID' });
    }
    const stats = await getUserStatisticsService(userId);
    res.status(200).json({ message: 'User statistics fetched successfully', data: stats });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * POST /api/admin/users
 * Body: { email, fullName, gender?, age?, height?, weight? }
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, fullName, gender, age, height, weight } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: 'MISSING_FIELDS' });
    }

    const result = await createUserService({ email, fullName, gender, age, height, weight });
    res.status(201).json({ message: 'User created successfully', data: result });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * PUT /api/admin/users/:userId
 * Body: { fullName?, gender?, age?, height?, weight? }
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId, 0);
    if (userId <= 0) {
      return res.status(400).json({ message: 'INVALID_USER_ID' });
    }
    console.log('[AdminController] PUT /users/:userId', userId, req.body);
    const user = await updateUserService(userId, req.body);
    console.log('[AdminController] PUT /users/:userId success', userId);
    res.status(200).json({ message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('[AdminController] PUT /users/:userId error:', error);
    handleError(error, res);
  }
};

/**
 * PATCH /api/admin/users/:userId/status
 * Body: { status: 'active' | 'inactive' | 'suspended' }
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId, 0);
    if (userId <= 0) {
      return res.status(400).json({ message: 'INVALID_USER_ID' });
    }
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'MISSING_STATUS' });
    }
    const user = await updateUserStatusService(userId, { status });
    res.status(200).json({ message: 'User status updated successfully', data: user });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId, 0);
    if (userId <= 0) {
      return res.status(400).json({ message: 'INVALID_USER_ID' });
    }
    console.log('[AdminController] DELETE /users/:userId', userId);
    const result = await deleteUserService(userId);
    console.log('[AdminController] DELETE /users/:userId success', userId);
    res.status(200).json({ message: 'User deleted successfully', data: result });
  } catch (error) {
    console.error('[AdminController] DELETE /users/:userId error:', error);
    handleError(error, res);
  }
};

/**
 * POST /api/admin/users/bulk-status
 * Body: { userIds: number[], status: string }
 */
export const bulkUpdateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userIds, status } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'MISSING_USER_IDS' });
    }
    if (!status) {
      return res.status(400).json({ message: 'MISSING_STATUS' });
    }
    const result = await bulkUpdateUserStatusService(userIds, status);
    res.status(200).json({ message: 'Bulk status update successful', data: result });
  } catch (error) {
    handleError(error, res);
  }
};
