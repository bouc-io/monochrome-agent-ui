
export type AuthTokens = { access: string; refresh: string } | null;

export type User = {
    sub?: string;
    preferred_username?: string;
    email?: string;
    name?: string;
    identityProvider?: string;
    [key: string]: unknown;
} | null;

export type AuthContextType = {
    user: User;
    authTokens: AuthTokens;
    keycloakObj: any; // Keycloak type
    loading: boolean;
    setAuthTokens: React.Dispatch<React.SetStateAction<AuthTokens>>;
    setUser: React.Dispatch<React.SetStateAction<User>>;
    login: () => Promise<void>;
    logoutUser: () => void;
    refreshToken?: () => Promise<AuthTokens>;
};

export type IdentityProvider = 'keycloak' | 'auth0' | 'okta' | 'stub';
