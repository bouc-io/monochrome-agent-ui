
import { Identity, IdentityProvider } from './types';
import logger from '@/lib/logger';

const log = logger.child('OktaAdapter');

class OktaIdentityProvider implements IdentityProvider {
    async init(): Promise<void> {
        // TODO: Implement Okta initialization
        log.warn('Okta adapter not yet implemented');
    }

    async getIdentity(): Promise<Identity> {
        // TODO: Implement Okta identity retrieval
        throw new Error('Okta adapter not yet implemented');
    }
}

export const OktaAdapter = new OktaIdentityProvider();
