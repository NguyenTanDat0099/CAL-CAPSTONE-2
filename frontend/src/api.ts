import { buildApiUrl } from './config/api';

const TOKEN_KEY = 'calai_token';

let _cachedToken: string | null = null;

const getToken = (): string => {
  if (_cachedToken !== null) return _cachedToken;
  try {
    _cachedToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    _cachedToken = '';
  }
  return _cachedToken;
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'REQUEST_FAILED' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// ──────────────────────────────────────────────
// Profile & Stats
// ──────────────────────────────────────────────
export const fetchAdminProfile = () =>
  request<{ message: string; data: import('./admin/types').AdminProfile }>(
    '/admin/profile'
  );

export const fetchAdminStats = () =>
  request<{ message: string; data: import('./admin/types').AdminStats }>(
    '/admin/stats'
  );

export const fetchAdminAnalytics = () =>
  request<{ message: string; data: import('./admin/types').AdminAnalytics }>(
    '/admin/analytics'
  );

export const fetchSecurityOverview = () =>
  request<{ message: string; data: import('./admin/types').SecurityOverview }>(
    '/admin/security/overview'
  );

export const fetchRoleAccounts = () =>
  request<{ message: string; data: import('./admin/types').RoleAccount[] }>(
    '/admin/security/roles'
  );

export const updateAccountRole = (accountId: number, role: 'admin' | 'user') =>
  request<{ message: string; data: import('./admin/types').RoleAccount }>(
    `/admin/security/roles/${accountId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }
  );

export const fetchAuditLogs = (limit = 50) =>
  request<{ message: string; data: import('./admin/types').AuditLog[] }>(
    `/admin/security/audit-logs?limit=${limit}`
  );

// ──────────────────────────────────────────────
// User Management
// ──────────────────────────────────────────────
export interface AdminNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  sentAt: string;
  readAt: string | null;
}

export const fetchAdminNotifications = (limit = 30) =>
  request<{ notifications: AdminNotification[]; unreadCount: number }>(
    `/admin/notifications?limit=${limit}`
  );

export const markAdminNotificationRead = (notificationId: number) =>
  request<{ updated: boolean }>(`/admin/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

export const markAllAdminNotificationsRead = () =>
  request<{ updated: number }>('/admin/notifications/mark-all-read', {
    method: 'POST',
  });

export interface GetUsersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const fetchUsers = (params: GetUsersParams = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);

  const query = qs.toString();
  return request<{ message: string; data: import('./admin/types').PaginatedUsers }>(
    `/admin/users${query ? `?${query}` : ''}`
  );
};

export const fetchUserById = (userId: number) =>
  request<{ message: string; data: import('./admin/types').User }>(
    `/admin/users/${userId}`
  );

export const fetchUserStatistics = (userId: number) =>
  request<{ message: string; data: import('./admin/types').UserStatistics }>(
    `/admin/users/${userId}/statistics`
  );

export const createUser = (payload: import('./admin/types').CreateUserPayload) =>
  request<{
    message: string;
    data: { user: import('./admin/types').User; tempPassword: string };
  }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateUser = (
  userId: number,
  payload: import('./admin/types').UpdateUserPayload
) =>
  request<{ message: string; data: import('./admin/types').User }>(
    `/admin/users/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );

export const updateUserStatus = (
  userId: number,
  status: 'active' | 'inactive' | 'suspended'
) =>
  request<{ message: string; data: import('./admin/types').User }>(
    `/admin/users/${userId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );

export const deleteUser = (userId: number) =>
  request<{ message: string; data: { deleted: boolean; userId: number } }>(
    `/admin/users/${userId}`,
    { method: 'DELETE' }
  );

export const bulkUpdateUserStatus = (
  userIds: number[],
  status: string
) =>
  request<{
    message: string;
    data: { updated: number; status: string };
  }>('/admin/users/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ userIds, status }),
  });

export interface GetFoodsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export const fetchFoods = (params: GetFoodsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);

  const query = qs.toString();
  return request<{ message: string; data: import('./admin/types').PaginatedFoods }>(
    `/admin/foods${query ? `?${query}` : ''}`
  );
};

export const fetchFoodCategories = () =>
  request<{ message: string; data: import('./admin/types').FoodCategory[] }>(
    '/admin/foods/categories'
  );

export const createFood = (payload: import('./admin/types').FoodPayload) =>
  request<{ message: string; data: import('./admin/types').FoodItem }>('/admin/foods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export interface BulkImportFoodsResponse {
  total: number;
  inserted: number;
  failed: Array<{ index: number; name: string | null; error: string }>;
}

export const bulkImportFoods = (rows: import('./admin/types').FoodPayload[]) =>
  request<{ message: string; data: BulkImportFoodsResponse }>('/admin/foods/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });

export const updateFood = (
  foodId: number,
  payload: import('./admin/types').FoodPayload
) =>
  request<{ message: string; data: import('./admin/types').FoodItem }>(
    `/admin/foods/${foodId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );

export const deleteFood = (foodId: number) =>
  request<{ message: string; data: { deleted: boolean; foodId: number } }>(
    `/admin/foods/${foodId}`,
    { method: 'DELETE' }
  );
