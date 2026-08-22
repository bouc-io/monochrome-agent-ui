
import { Identity, IdentityProvider } from './adapters/types';
import { getIdentityProvider } from './authUtils';
import logger from '@/lib/logger';

const log = logger.child('Identity');

// Lazy-loaded adapters to prevent instantiation at import time
const getProviderAdapter = async (provider: string): Promise<IdentityProvider | null> => {
    switch (provider.toLowerCase()) {
        case 'keycloak': {
            const { KeycloakAdapter } = await import('./adapters/keycloak');
            return KeycloakAdapter;
        }
        case 'auth0': {
            const { Auth0Adapter } = await import('./adapters/auth0');
            return Auth0Adapter;
        }
        case 'okta': {
            const { OktaAdapter } = await import('./adapters/okta');
            return OktaAdapter;
        }
        case 'stub': {
            const { StubAdapter } = await import('./adapters/stub');
            return StubAdapter;
        }
        default:
            return null;
    }
};

let currentAdapter: IdentityProvider | null = null;

export async function initializeIdentity(): Promise<void> {
    const selectedProvider = getIdentityProvider();

    log.info('Initializing identity system:', {
        selectedProvider,
        availableProviders: ['keycloak', 'auth0', 'okta', 'stub'],
        currentAdapter: currentAdapter ? 'exists' : 'null'
    });

    const adapter = await getProviderAdapter(selectedProvider);
    if (!adapter) {
        const error = `Unsupported identity provider: ${selectedProvider}`;
        log.error('Identity initialization failed:', {
            error,
            selectedProvider,
            availableProviders: ['keycloak', 'auth0', 'okta', 'stub']
        });
        throw new Error(error);
    }

    log.info('Setting current adapter and initializing');
    currentAdapter = adapter;

    try {
        await adapter.init();
        log.info('Adapter initialized successfully:', {
            provider: selectedProvider,
            adapterType: typeof adapter
        });
    } catch (error) {
        log.error('Adapter initialization failed:', {
            provider: selectedProvider,
            error,
            message: error?.message,
            stack: error?.stack
        });
        throw error;
    }
}

export async function getIdentity(): Promise<Identity | null> {
    log.debug('Getting identity from current adapter:', {
        hasCurrentAdapter: !!currentAdapter,
        adapterType: currentAdapter ? typeof currentAdapter : 'null'
    });

    if (!currentAdapter) {
        log.error('Identity provider not initialized', {
            currentAdapter: 'null',
            suggestion: 'Call initializeIdentity() first'
        });
        return null;
    }

    try {
        const identity = await currentAdapter.getIdentity();

        log.debug('Retrieved identity:', {
            hasUser: !!identity?.user,
            hasTokens: !!identity?.authTokens,
            loading: identity?.loading,
            userProvider: identity?.user?.identityProvider,
            tokenCount: identity?.authTokens ? Object.keys(identity.authTokens).length : 0
        });

        return identity;
    } catch (error) {
        log.error('Failed to get identity:', {
            error,
            message: error?.message,
            adapterType: typeof currentAdapter
        });
        throw error;
    }
}

export function cleanupIdentity(): void {
    log.info('Cleaning up identity provider:', {
        hasCurrentAdapter: !!currentAdapter,
        hasCleanupMethod: !!(currentAdapter?.cleanup)
    });

    if (currentAdapter && currentAdapter.cleanup) {
        try {
            currentAdapter.cleanup();
            log.info('Adapter cleanup completed');
        } catch (error) {
            log.error('Cleanup failed:', {
                error,
                message: error?.message
            });
        }
    }

    currentAdapter = null;
    log.info('Identity cleanup completed');
}
