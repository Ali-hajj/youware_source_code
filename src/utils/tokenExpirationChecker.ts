import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';

let tokenCheckInterval: NodeJS.Timeout | null = null;

/**
 * Starts periodic token expiration checking
 * Checks every 30 seconds if the token is expired
 */
export function startTokenExpirationChecker() {
  // Clear any existing interval
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
  }

  // Check token expiration every 30 seconds
  tokenCheckInterval = setInterval(() => {
    const authStore = useAuthStore.getState();
    
    // Only check if user is logged in and has a real token
    if (authStore.token && authStore.token !== 'offline-bypass-token') {
      authStore.checkTokenExpiration();
    }
  }, 30000); // 30 seconds
}

/**
 * Stops the token expiration checker
 */
export function stopTokenExpirationChecker() {
  if (tokenCheckInterval) {
    clearInterval(tokenCheckInterval);
    tokenCheckInterval = null;
  }
}

/**
 * React hook to automatically start/stop token expiration checking
 */
export function useTokenExpirationChecker() {
  const { token } = useAuthStore();

  // Start checker when component mounts and user is logged in
  useEffect(() => {
    if (token && token !== 'offline-bypass-token') {
      startTokenExpirationChecker();
    } else {
      stopTokenExpirationChecker();
    }

    // Cleanup on unmount
    return () => {
      stopTokenExpirationChecker();
    };
  }, [token]);
}