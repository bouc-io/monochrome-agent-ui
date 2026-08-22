import { AuthTokens, User } from '@/auth/types';
import { getIdentity } from '@/auth/identity';
import logger from '@/lib/logger';

const log = logger.child('AuthStore');

interface AuthState {
  authenticated: boolean;
  user: User;
  authTokens: AuthTokens;
}

class AuthStore {
  private state: AuthState = {
    authenticated: false,
    user: null,
    authTokens: null
  };

  private listeners: (() => void)[] = [];

  // Get current auth state
  getState(): AuthState {
    return { ...this.state };
  }

  // Subscribe to auth state changes
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of state changes
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  // Initialize OAuth with identity provider
  async initOauth(user: User, authTokens: AuthTokens, clearData = true): Promise<void> {
    if (clearData) {
      await this.clearUserData();
    }

    this.state.authenticated = !!(user && authTokens?.access);
    this.state.user = user;
    this.state.authTokens = authTokens;

    // Store tokens in localStorage for persistence
    if (authTokens) {
      localStorage.setItem('authTokens', JSON.stringify(authTokens));
    }

    this.notify();
    log.info('Auth store initialized with identity provider data');
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      const identity = await getIdentity();
      if (identity) {
        identity.logoutUser();
      }
      await this.clearUserData();
    } catch (error) {
      log.error('Logout error:', error);
    }
  }

  // Refresh user's token using the current identity provider
  async refreshUserToken(): Promise<AuthTokens> {
    try {
      const identity = await getIdentity();
      if (identity && identity.refreshToken) {
        const newTokens = await identity.refreshToken();
        this.state.authTokens = newTokens;
        this.state.user = identity.user;

        if (newTokens) {
          localStorage.setItem('authTokens', JSON.stringify(newTokens));
        }

        this.notify();
        log.info('Auth store token refreshed successfully');
        return newTokens;
      }
      return this.state.authTokens;
    } catch (error) {
      log.error('Token refresh error:', error);
      throw error;
    }
  }

  // Clear user's store data
  async clearUserData(): Promise<void> {
    this.state.authenticated = false;
    this.state.user = null;
    this.state.authTokens = null;
    localStorage.removeItem('authTokens');
    this.notify();
    log.info('Auth store data cleared');
  }

  // Get user token for API calls
  getToken(): string | undefined {
    return this.state.authTokens?.access;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.state.authenticated && !!this.state.authTokens?.access;
  }

  // Get user data
  getUser(): User {
    return this.state.user;
  }

  // Test action for debugging
  testAction(): void {
    log.debug('Auth store test action called');
  }
}

// Export singleton instance
export const authStore = new AuthStore();

// Export the class for type definitions
export type { AuthState };
export default authStore;
