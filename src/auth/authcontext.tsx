
import React, { createContext, useState, useEffect, useRef } from 'react';
import { AuthTokens, User, AuthContextType } from './types';
import { initializeIdentity, getIdentity, cleanupIdentity } from './identity';
import tokenInterceptorSetup from '@/lib/tokenInterceptors';
import { authStore } from '@/lib/authStore';
import logger from '@/lib/logger';

const log = logger.child('AuthProvider');

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
    const instanceId = useRef(Math.random().toString(36).substr(2, 9));
    const initializationDone = useRef(false);
    const initializationFailed = useRef(false);
    const interceptorsSetup = useRef(false);
    
    // Get initial state from auth store
    const [authTokens, setAuthTokens] = useState<AuthTokens>(() => {
        return authStore.getState().authTokens;
    });
    const [user, setUser] = useState<User>(() => {
        return authStore.getState().user;
    });
    const [loading, setLoading] = useState(true);

    // Subscribe to auth store changes
    useEffect(() => {
        const unsubscribe = authStore.subscribe(() => {
            const state = authStore.getState();
            setAuthTokens(state.authTokens);
            setUser(state.user);
        });

        return unsubscribe;
    }, []);

    const createAuthStore = () => {
        return {
            authenticated: !!user,
            user: user,
            authTokens: authTokens,
            refreshUserToken: refreshToken
        };
    };

    const initializeAuth = async () => {
        if (initializationDone.current || initializationFailed.current) {
            log.debug('Auth already processed, skipping');
            return;
        }

        initializationDone.current = true;
        log.info('Initializing auth, instance:', instanceId.current);

        try {
            await initializeIdentity();
            const identity = await getIdentity();
            
            if (identity) {
                await authStore.initOauth(identity.user, identity.authTokens);
                log.info('✅ Auth initialized successfully');
            } else {
                log.warn('No identity returned from provider');
            }
        } catch (error) {
            log.error('Auth initialization failed:', error);
            initializationFailed.current = true;
        } finally {
            setLoading(false);
        }
    };

    // Setup token interceptors whenever auth state changes
    useEffect(() => {
        if (!interceptorsSetup.current) {
            const authStoreData = createAuthStore();
            tokenInterceptorSetup(authStoreData);
            interceptorsSetup.current = true;
            log.debug('Token interceptors set up');
        } else {
            const authStoreData = createAuthStore();
            window.__AUTH_STORE__ = authStoreData;
        }
    }, [user, authTokens]);

    const login = async () => {
        const identity = await getIdentity();
        if (identity) {
            await identity.login();
        }
    };

    const logoutUser = () => {
        const performLogout = async () => {
            await authStore.logout();
            
            if (window.__AUTH_STORE__) {
                delete window.__AUTH_STORE__;
            }
        };
        performLogout();
    };

    const refreshToken = async (): Promise<AuthTokens> => {
        return await authStore.refreshUserToken();
    };

    const contextData: AuthContextType = {
        user: user,
        authTokens: authTokens,
        keycloakObj: null,
        loading: loading,
        setAuthTokens: setAuthTokens,
        setUser: setUser,
        login: login,
        logoutUser: logoutUser,
        refreshToken: refreshToken,
    };

    useEffect(() => {
        log.debug('AuthProvider mounted, instance:', instanceId.current);
        initializeAuth();
        
        return () => {
            cleanupIdentity();
            if (window.__AUTH_STORE__) {
                delete window.__AUTH_STORE__;
            }
        };
    }, []);

    return (
        <AuthContext.Provider value={contextData}>
            {loading ? (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Initializing authentication...</p>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;

// Extend the global window interface to include our auth store
declare global {
    interface Window {
        __AUTH_STORE__?: {
            authenticated: boolean;
            user: User;
            authTokens: AuthTokens;
            refreshUserToken?: () => Promise<AuthTokens>;
        };
    }
}
