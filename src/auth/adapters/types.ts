import { AuthTokens, User } from '../types';

export interface Identity {
    user: User;
    authTokens: AuthTokens;
    loading: boolean;
    login: () => Promise<void>;
    logoutUser: () => void;
    refreshToken?: () => Promise<AuthTokens>;
}

export interface IdentityProvider {
    getIdentity(): Promise<Identity>;
    init(): Promise<void>;
    cleanup?(): void;
}
