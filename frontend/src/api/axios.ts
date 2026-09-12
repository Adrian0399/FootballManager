import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { ErrorEnvelope, SuccessEnvelope, AuthPayload } from '../types/user';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  // NOTE: do NOT set a default `Content-Type` here.
  // - For plain object bodies, axios sets `application/json` automatically.
  // - For FormData bodies, axios sets `multipart/form-data; boundary=...` automatically.
  // Setting a default `application/json` blocks the FormData path and
  // makes multer see an empty body on the server.
});

// Attach the in-memory access token to every request.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ----- Silent refresh on 401 -----
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  for (const { resolve, reject } of failedQueue) {
    if (token) resolve(token);
    else reject(error);
  }
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorEnvelope>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<SuccessEnvelope<AuthPayload>>(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newAccessToken = data.data.accessToken;
        useAuthStore.getState().setAuth(data.data.user, newAccessToken);
        processQueue(null, newAccessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clear();
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);