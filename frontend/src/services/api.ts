import type { ApiDiaryEntry, DashboardApiResponse } from '@/types';
import type { AuthUser } from '@/components/auth-provider';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export type AuthMeResponse = { success: true; data: { user: AuthUser } };

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { error?: { message?: string } } | undefined;
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.replace('/login');
    }
    throw new ApiError(response.status, payload?.error?.message ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authService = {
  login: (payload: unknown) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload: unknown) => apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest<AuthMeResponse>('/api/auth/me'),
};

export const diaryService = {
  list: (query = '') => apiRequest<{ success: true; data: { entries: ApiDiaryEntry[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } } }>(`/api/diary/entries${query}`).then((result) => result.data),
  create: (payload: unknown) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>('/api/diary/entries', { method: 'POST', body: JSON.stringify(payload) }).then((result) => result.data.entry),
  get: (id: string) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}`).then((result) => result.data.entry),
  update: (id: string, payload: unknown) => apiRequest<{ success: true; data: { entry: ApiDiaryEntry } }>(`/api/diary/entries/${id}`, { method: 'PUT', body: JSON.stringify(payload) }).then((result) => result.data.entry),
  remove: (id: string) => apiRequest(`/api/diary/entries/${id}`, { method: 'DELETE' }),
};

export const dashboardService = {
  get: () => apiRequest<DashboardApiResponse>('/api/dashboard').then((result) => result.data),
};

export const assistantService = {
  ask: (payload: unknown) => apiRequest('/api/ai/conversations/messages', { method: 'POST', body: JSON.stringify(payload) }),
};

export const beneficiaryService = {
  list: () => apiRequest('/api/beneficiaries'),
  create: (payload: unknown) => apiRequest('/api/beneficiaries', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (id: string) => apiRequest(`/api/beneficiaries/${id}`, { method: 'DELETE' }),
};

export const policyService = {
  list: () => apiRequest('/api/policies'),
  validate: (policy: string) => apiRequest('/api/policies/validate', { method: 'POST', body: JSON.stringify({ policy }) }),
  create: (payload: unknown) => apiRequest('/api/policies', { method: 'POST', body: JSON.stringify(payload) }),
};

export const writingModeService = {
  process: (payload: unknown) => apiRequest('/api/diary/writing-modes/process', { method: 'POST', body: JSON.stringify(payload) }),
};

export const wishesService = {
  get: () => apiRequest('/api/letter-of-wishes'),
  save: (payload: unknown) => apiRequest('/api/letter-of-wishes', { method: 'PUT', body: JSON.stringify(payload) }),
};

export const activityService = {
  list: (query = '') => apiRequest(`/api/activity-logs${query}`),
};

export const settingsService = {
  getProfile: () => apiRequest('/api/settings/profile'),
  updateProfile: (payload: unknown) => apiRequest('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePreferences: (payload: unknown) => apiRequest('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(payload) }),
};