import { Identity, IdentityProvider } from "./types";
import logger from "@/lib/logger";

const log = logger.child("Auth0Adapter");

class Auth0IdentityProvider implements IdentityProvider {
  async init(): Promise<void> {
    // TODO: Implement Auth0 initialization
    log.warn("Auth0 adapter not yet implemented");
  }

  async getIdentity(): Promise<Identity> {
    // TODO: Implement Auth0 identity retrieval
    throw new Error("Auth0 adapter not yet implemented");
  }
}

export const Auth0Adapter = new Auth0IdentityProvider();
