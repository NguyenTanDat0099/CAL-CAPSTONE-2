import { Request, Response } from 'express';
import {
  getAdminProfileService,
  getAdminStatsService,
  getAdminAnalyticsService,
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  updateUserStatusService,
  deleteUserService,
  bulkUpdateUserStatusService,
  getUserStatisticsService,
  getAdminFoodsService,
  getAdminFoodByIdService,
  createAdminFoodService,
  bulkImportAdminFoodsService,
  updateAdminFoodService,
  deleteAdminFoodService,
  getFoodCategoriesService,
  createAdminAuditLogService,
  getAdminSecurityOverviewService,
  getRoleAccountsService,
  updateAccountRoleService,
  getAdminAuditLogsService,
  AdminServiceError,
} from '../services/admin.service';
import { createAdminNotifications } from '../../notifications/services/notification.service';

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

const parseIntParam = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  const str = Array.isArray(value) ? String(value[0]) : String(value);
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const writeAuditLog = async (
  req: Request,
  action: string,
  targetType: string,
  targetId?: number | null,
  detail?: string | null
) => {
  try {
    await createAdminAuditLogService({
      adminAccountId: req.auth?.accountId,
      action,
      targetType,
      targetId,
      detail,
    });
  } catch (error) {
    console.error('[AdminAudit] Failed to write audit log:', error);
  }
};

const notifyAdmins = async (
  title: string,
  message: string,
  data: Record<string, unknown>
) => {
  try {
    await createAdminNotifications({
      type: 'system',
      title,
      message,
      data,
    });
  } catch (error) {
    console.error('[AdminNotification] Failed to write notification:', error);
  }
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

export const getAdminAnalytics = async (req: Request, res: Response) => {
  try {
    const analytics = await getAdminAnalyticsService();
    res.status(200).json({ message: 'Admin analytics fetched successfully', data: analytics });
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
    await writeAuditLog(req, 'CREATE_USER', 'user', result.user?.id, `Created user ${email}`);
    await notifyAdmins(
      'New user added',
      `${result.user.name} (${email}) was added to the system.`,
      { event: 'USER_CREATED_BY_ADMIN', userId: result.user?.id, email, adminAccountId: req.auth?.accountId }
    );
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
    await writeAuditLog(req, 'UPDATE_USER', 'user', userId, `Updated user ${userId}`);
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
    await writeAuditLog(req, 'UPDATE_USER_STATUS', 'user', userId, `Changed status to ${status}`);
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
    await writeAuditLog(req, 'DELETE_USER', 'user', userId, `Deleted user ${userId}`);
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
    await writeAuditLog(req, 'BULK_UPDATE_USER_STATUS', 'user', null, `Changed ${userIds.length} users to ${status}`);
    res.status(200).json({ message: 'Bulk status update successful', data: result });
  } catch (error) {
    handleError(error, res);
  }
};

export const getAllFoods = async (req: Request, res: Response) => {
  try {
    const page = parseIntParam(req.query.page, 1);
    const limit = parseIntParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const result = await getAdminFoodsService({ page, limit, search, category });
    res.status(200).json({ message: 'Foods fetched successfully', data: result });
  } catch (error) {
    handleError(error, res);
  }
};

export const getFoodById = async (req: Request, res: Response) => {
  try {
    const foodId = parseIntParam(req.params.foodId, 0);
    const food = await getAdminFoodByIdService(foodId);
    res.status(200).json({ message: 'Food fetched successfully', data: food });
  } catch (error) {
    handleError(error, res);
  }
};

export const createFood = async (req: Request, res: Response) => {
  try {
    const food = await createAdminFoodService(req.body);
    await writeAuditLog(req, 'CREATE_FOOD', 'food', food.id, `Created food ${food.name}`);
    await notifyAdmins(
      'Content item created',
      `${food.name} was added in Content Manager.`,
      { event: 'CONTENT_CREATED', foodId: food.id, foodName: food.name, adminAccountId: req.auth?.accountId }
    );
    res.status(201).json({ message: 'Food created successfully', data: food });
  } catch (error) {
    handleError(error, res);
  }
};

export const bulkImportFoods = async (req: Request, res: Response) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const result = await bulkImportAdminFoodsService(rows);
    await writeAuditLog(
      req,
      'BULK_IMPORT_FOOD',
      'food',
      null,
      `Imported ${result.inserted}/${result.total} foods, ${result.failed.length} failed`
    );
    res.status(200).json({ message: 'Bulk import completed', data: result });
  } catch (error) {
    handleError(error, res);
  }
};

export const updateFood = async (req: Request, res: Response) => {
  try {
    const foodId = parseIntParam(req.params.foodId, 0);
    const food = await updateAdminFoodService(foodId, req.body);
    await writeAuditLog(req, 'UPDATE_FOOD', 'food', foodId, `Updated food ${food.name}`);
    await notifyAdmins(
      'Content item updated',
      `${food.name} was updated in Content Manager.`,
      { event: 'CONTENT_UPDATED', foodId, foodName: food.name, adminAccountId: req.auth?.accountId }
    );
    res.status(200).json({ message: 'Food updated successfully', data: food });
  } catch (error) {
    handleError(error, res);
  }
};

export const deleteFood = async (req: Request, res: Response) => {
  try {
    const foodId = parseIntParam(req.params.foodId, 0);
    const existingFood = foodId > 0 ? await getAdminFoodByIdService(foodId).catch(() => null) : null;
    const result = await deleteAdminFoodService(foodId);
    await writeAuditLog(req, 'DELETE_FOOD', 'food', foodId, `Deleted food ${foodId}`);
    await notifyAdmins(
      'Content item deleted',
      `${existingFood?.name ?? `Food #${foodId}`} was deleted from Content Manager.`,
      { event: 'CONTENT_DELETED', foodId, foodName: existingFood?.name ?? null, adminAccountId: req.auth?.accountId }
    );
    res.status(200).json({ message: 'Food deleted successfully', data: result });
  } catch (error) {
    handleError(error, res);
  }
};

export const getSecurityOverview = async (req: Request, res: Response) => {
  try {
    const overview = await getAdminSecurityOverviewService();
    res.status(200).json({ message: 'Security overview fetched successfully', data: overview });
  } catch (error) {
    handleError(error, res);
  }
};

export const getRoleAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await getRoleAccountsService();
    res.status(200).json({ message: 'Role accounts fetched successfully', data: accounts });
  } catch (error) {
    handleError(error, res);
  }
};

export const updateAccountRole = async (req: Request, res: Response) => {
  try {
    const accountId = parseIntParam(req.params.accountId, 0);
    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ message: 'INVALID_ROLE' });
    }

    const account = await updateAccountRoleService(accountId, role);
    await writeAuditLog(req, 'UPDATE_ACCOUNT_ROLE', 'account', accountId, `Changed account ${accountId} role to ${role}`);
    res.status(200).json({ message: 'Account role updated successfully', data: account });
  } catch (error) {
    handleError(error, res);
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const limit = parseIntParam(req.query.limit, 50);
    const logs = await getAdminAuditLogsService(limit);
    res.status(200).json({ message: 'Audit logs fetched successfully', data: logs });
  } catch (error) {
    handleError(error, res);
  }
};

export const getFoodCategories = async (req: Request, res: Response) => {
  try {
    const categories = await getFoodCategoriesService();
    res.status(200).json({ message: 'Food categories fetched successfully', data: categories });
  } catch (error) {
    handleError(error, res);
  }
};
