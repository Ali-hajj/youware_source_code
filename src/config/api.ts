import { APIResponse } from "../types";

const API_CONFIG = {
  production: {
    baseURL: "https://stuntec.org/Events/api",
  },
  staging: {
    baseURL: "https://staging.stuntec.org/api",
  },
  development: {
    baseURL: "http://localhost:8000/api",
  },
  local: {
    baseURL: "http://localhost:8000/api",
  },
};
const API_ENDPOINTS = {
  users: "users",
  events: "events",
  userById: (id: string | number) => `users/${id}`,
  authLogin: "auth/login",
  authLogout: "auth/logout",
  authSignup: "auth/signup",
  authMe: "auth/me",
  authResetPassword: "auth/reset-password",
  // Add other endpoints as needed
};

const ENV = import.meta.env.MODE || "local";

export function isScreenshotEnvironment(): boolean {
  // Checks if NODE_ENV is set to 'screenshot'
  // You can customize the condition here if needed

  // In browser environments, process.env might not exist.
  // If you're using Vite, use import.meta.env instead:

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.MODE === 'screenshot';
  }

  // Fallback to Node.js process.env if available
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'screenshot';
  }

  // Default to false if neither env is available
  return false;
}

let tokenGetter: () => string | null = () => null;

export function setAuthTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export function getAuthToken() {
  return tokenGetter();
}


const API_ENV = (import.meta.env.VITE_API_ENV as keyof typeof API_CONFIG) || "production";

export const getApiBaseUrl = () => {
  const config = API_CONFIG[API_ENV];
  return config?.baseURL || API_CONFIG.production.baseURL;
};

interface ApiCallOptions {
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
}

export async function apiCall(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const baseURL = getApiBaseUrl();  // ✅ Correct
    const url = baseURL.endsWith('/') ? `${baseURL}${endpoint}` : `${baseURL}/${endpoint}`;

    const token = getAuthToken();
    const headers = new Headers(options.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const requestOptions: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(url, requestOptions);

    if (response.status === 401 || response.status === 403) {
        const { useAuthStore } = await import('../store/authStore');
        const authStore = useAuthStore.getState();

        if (authStore.token && authStore.token !== 'offline-bypass-token') {
            console.warn('Token expired or unauthorized, logging out...');
            await authStore.logout();
            window.location.reload();
        }
    }

    return response;
}

export { API_CONFIG };
export { API_ENDPOINTS };
