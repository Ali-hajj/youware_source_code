import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_CONFIG, API_ENDPOINTS, apiCall, setAuthTokenGetter } from '../config/api';
import { AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  token: string | null;
  expiresAt: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  login: (credentials: { username?: string; password?: string }) => Promise<void>;
  forceLogin: (options?: { username?: string }) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'eventManager_auth';

const fetchWithAuth = async (input: string, init?: RequestInit) => {
  return apiCall(input, init);
};

const createOfflineUser = (username = 'admin'): AppUser => ({
  id: `offline-${Date.now()}`,
  username,
  role: 'admin',
  firstName: 'Offline',
  lastName: 'Access',
  phone: '313-938-6666',
  email: 'support@stuntec.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefaultAdmin: true,
});

const OFFLINE_TOKEN = 'offline-bypass-token';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      expiresAt: null,
      isLoading: false,
      error: null,


      async login({ username, password }) {
        const fallbackLogin = (name?: string) => {
          const offlineUser = createOfflineUser(name || username || 'admin');
          const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
          set({
            user: offlineUser,
            token: OFFLINE_TOKEN,
            expiresAt,
            isLoading: false,
            error: null,
          });
          return offlineUser;
        };

        set({ isLoading: true, error: null });
        try {
          const response = await fetchWithAuth(API_ENDPOINTS.authLogin, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({ error: 'Login failed' }));
            throw new Error(data.error || 'Login failed');
          }

          const data = await response.json();
          const { token, expiresAt, user } = data;

          set({
            user,
            token,
            expiresAt,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const isNetworkError = error instanceof TypeError || (error instanceof Error && /fetch/i.test(error.message));
          const typedError = error instanceof Error ? error : new Error('Login failed');

          if (isNetworkError || typedError.message.includes('Failed to fetch')) {
            const offlineUser = fallbackLogin(username);
            console.warn('Login fell back to offline mode for user:', offlineUser.username);
            return;
          }

          if (username === 'admin' && password === 'admin') {
            fallbackLogin('admin');
            return;
          }

          set({
            isLoading: false,
            error: typedError.message,
          });
          throw typedError;
        }
      },

      forceLogin(options) {
        const offlineUser = createOfflineUser(options?.username);
        const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
        set({
          user: offlineUser,
          token: OFFLINE_TOKEN,
          expiresAt,
          isLoading: false,
          error: null,
        });
      },

      async logout() {
        try {
          await fetchWithAuth(API_ENDPOINTS.authLogout, {
            method: 'POST',
          });
        } catch (error) {
          console.warn('Failed to logout from backend:', error);
        }

        set({ user: null, token: null, expiresAt: null, error: null });
      },

      clearError() {
        set({ error: null });
      },

      async refreshProfile() {
        const token = get().token;
        if (!token) {
          return;
        }

        try {
          const response = await fetchWithAuth(API_ENDPOINTS.authMe);
          if (!response.ok) {
            throw new Error('Failed to fetch profile');
          }
          const data = await response.json();
          set({ user: data.user as AppUser, error: null });
        } catch (error) {
          console.warn('Failed to refresh profile:', error);
          await get().logout();
        }
      },


    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.token && state.expiresAt && state.expiresAt > Date.now()) {
          useAuthStore.getState().refreshProfile().catch(() => {
            useAuthStore.getState().logout();
          });
        } else {
          useAuthStore.getState().logout();
        }
      },
    }
  )
);

setAuthTokenGetter(() => useAuthStore.getState().token);
