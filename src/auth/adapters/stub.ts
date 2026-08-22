
import { jwtDecode } from "jwt-decode";
import { getEnvVar, isValidJWT } from "../authUtils";
import { AuthTokens, User } from '../types';
import { Identity, IdentityProvider } from './types';
import { authStore } from '@/lib/authStore';
import logger from '@/lib/logger';

const log = logger.child('StubAuth');

class StubIdentityProvider implements IdentityProvider {
    private authTokens: AuthTokens = null;
    private user: User = null;
    private loading: boolean = true;

    async init(): Promise<void> {
        log.info('Initializing stub auth');

        const accessToken = getEnvVar('VITE_ACCESS_TOKEN');
        const refreshToken = getEnvVar('VITE_REFRESH_TOKEN');

        log.debug('Token check:', {
            hasAccessToken: !!accessToken,
            isDefault: accessToken === 'your-access-token-here',
            hasRefreshToken: !!refreshToken,
        });

        if (accessToken && accessToken !== 'your-access-token-here' && isValidJWT(accessToken)) {
            log.debug('Attempting to use real tokens from environment');
            
            try {
                const tokens = { access: accessToken, refresh: refreshToken };
                const decodedUser = jwtDecode(accessToken);

                log.debug('JWT decoded successfully:', { keys: Object.keys(decodedUser) });

                this.authTokens = tokens;
                this.user = { 
                    ...(decodedUser as any), 
                    identityProvider: 'stub' 
                };
                
                await authStore.initOauth(this.user, tokens);
                log.info('✅ Real tokens loaded from .env');
                this.loading = false;
                return;
            } catch (error) {
                log.error('Failed to decode .env tokens, falling back to mock:', error);
            }
        } else {
            log.debug('No valid env tokens, using fallback');
        }

        await this.setFallbackTokens();
        this.loading = false;
    }

    private async setFallbackTokens(): Promise<void> {
        const mockTokens = {
            access: 'mock-access-token-for-development',
            refresh: 'mock-refresh-token-for-development'
        };
        
        this.authTokens = mockTokens;
        this.user = {
            sub: 'mock-user',
            preferred_username: 'developer',
            email: 'dev@example.com',
            name: 'Development User',
            identityProvider: 'stub'
        };
        
        await authStore.initOauth(this.user, mockTokens);
        log.info('✅ Fallback mock tokens initialized');
    }

    async getIdentity(): Promise<Identity> {
        log.debug('getIdentity called:', { hasUser: !!this.user, loading: this.loading });

        return {
            user: this.user,
            authTokens: this.authTokens,
            loading: this.loading,
            login: async () => {
                log.warn('Login skipped (stub provider)');
            },
            logoutUser: () => {
                log.info('Logging out from stub');
                this.authTokens = null;
                this.user = null;
                authStore.clearUserData();
            },
            refreshToken: async () => {
                log.debug('Token refresh skipped (stub provider)');
                return this.authTokens;
            }
        };
    }
}

export const StubAdapter = new StubIdentityProvider();
