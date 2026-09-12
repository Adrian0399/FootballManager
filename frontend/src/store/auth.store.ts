import { create } from 'zustand';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

/**
 * Auth store — access token lives ONLY in memory (Zustand).
 * It is never persisted to localStorage / sessionStorage to limit XSS exposure.
 * The refresh token is an httpOnly cookie managed by the backend.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null }),
}));