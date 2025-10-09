import { APIResponse } from "../types";

const API_CONFIG = {
  production: {
    baseURL: "https://yourdomain.com/api",
  },
  staging: {
    baseURL: "https://staging.yourdomain.com/api",
  },
  development: {
    baseURL: "http://localhost:3000/api",
  },
  local: {
    baseURL: "http://localhost:3000/api",
  },
};
const API_ENDPOINTS = {
  users: "users",
  events: "events",
  userById: (id: string | number) => `users/${id}`,
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
  const baseURL = API_CONFIG[ENV].baseURL;
  const url = baseURL.endsWith('/') ? `${baseURL}${endpoint}` : `${baseURL}/${endpoint}`;
  return fetch(url, options);
}
export { API_CONFIG };
export { API_ENDPOINTS };