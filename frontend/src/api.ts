import type {
  CreateTaskInput,
  LoginResponse,
  PaginatedTasks,
  Task,
  TaskStats,
  UpdateTaskInput,
} from './types';

const TOKEN_KEY = 'taskboard.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: (() => void) | null = null;

/** Registered by the app shell so an expired token kicks back to login. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Minimal fetch wrapper. Paths are RELATIVE (same origin) so the same build
 * works in dev (Vite proxy) and production (served by the backend).
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response body; fall through to the generic error below.
  }

  if (!res.ok) {
    // A 401 outside of login means the token is missing/expired — log out.
    if (res.status === 401 && !path.startsWith('/api/auth/') && onUnauthorized) {
      onUnauthorized();
    }
    const err = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? `Request failed with status ${res.status}`,
    );
  }

  return body as T;
}

export const api = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  listTasks(): Promise<PaginatedTasks> {
    return request<PaginatedTasks>('/api/tasks?limit=100');
  },

  createTask(input: CreateTaskInput): Promise<Task> {
    return request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) });
  },

  updateTask(id: number, input: UpdateTaskInput): Promise<Task> {
    return request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  deleteTask(id: number): Promise<void> {
    return request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  getStats(): Promise<TaskStats> {
    return request<TaskStats>('/api/stats');
  },
};
