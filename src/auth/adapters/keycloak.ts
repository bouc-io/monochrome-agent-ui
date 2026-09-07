import Keycloak from "keycloak-js";
import { getEnvVar, isKeycloakCallback } from "../authUtils";
import { AuthTokens, User } from "../types";
import { Identity, IdentityProvider } from "./types";
import { authStore } from "@/lib/authStore";
import logger from "@/lib/logger";

const log = logger.child("KeycloakAdapter");

class KeycloakIdentityProvider implements IdentityProvider {
  private keycloak: Keycloak | null = null;
  private authTokens: AuthTokens = null;
  private user: User = null;
  private loading: boolean = true;
  private authenticated: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private initializationAttempted: boolean = false;

  private getKeycloak(): Keycloak {
    if (!this.keycloak) {
      const options = {
        url: getEnvVar("VITE_SSO_SERVER_URL"),
        realm: getEnvVar("VITE_OAUTH_REALM"),
        clientId: getEnvVar("VITE_OAUTH_CLIENT_ID"),
      };

      log.info("Creating instance with options:", {
        url: options.url,
        realm: options.realm,
        clientId: options.clientId,
        hasUrl: !!options.url,
        hasRealm: !!options.realm,
        hasClientId: !!options.clientId,
      });

      if (!options.url) {
        throw new Error(
          "Keycloak URL not configured. Set VITE_SSO_SERVER_URL environment variable.",
        );
      }

      this.keycloak = new Keycloak(options);
    }
    return this.keycloak;
  }

  async init(): Promise<void> {
    log.info("Init called", {
      hasInitPromise: !!this.initializationPromise,
      initAttempted: this.initializationAttempted,
      currentUrl: window.location.href,
    });

    // Prevent multiple initialization attempts
    if (this.initializationPromise) {
      log.info("Initialization already in progress");
      return this.initializationPromise;
    }

    if (this.initializationAttempted) {
      log.info("Initialization already attempted");
      return;
    }

    // Initialize keycloak instance here (lazy)
    try {
      this.getKeycloak();
    } catch (error) {
      log.error("Configuration error:", error);
      this.loading = false;
      throw error;
    }

    this.initializationAttempted = true;
    this.initializationPromise = this.performInit();
    return this.initializationPromise;
  }

  private async performInit(): Promise<void> {
    log.info("Initializing Keycloak authentication");

    const keycloak = this.getKeycloak();

    const isCallback = isKeycloakCallback();
    log.info(" URL analysis:", {
      isCallback,
      currentUrl: window.location.href,
      hasCode: window.location.href.includes("code="),
      hasState: window.location.href.includes("state="),
      hasAccessToken: window.location.href.includes("access_token="),
      searchParams: window.location.search,
      hash: window.location.hash,
    });

    try {
      const initOptions = {
        onLoad: "check-sso" as const,
        silentCheckSsoFallback: false,
        pkceMethod: "S256" as const,
        checkLoginIframe: false, // Disable iframe-based SSO checks to prevent CORS polling
        enableLogging: false, // Disable Keycloak's internal logging
        responseMode: "fragment" as const,
      };

      log.info(" Init options detailed:", {
        ...initOptions,
        timeBeforeInit: Date.now(),
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        pathname: window.location.pathname,
      });

      // CORS troubleshooting
      log.info(" CORS check:", {
        serverUrl: getEnvVar("VITE_SSO_SERVER_URL"),
        currentOrigin: window.location.origin,
        expectedRedirectUri: `${window.location.origin}${window.location.pathname}`,
      });

      // Enhanced error handling with more specific error capture
      log.info(" About to call init() method");

      let initResult;
      try {
        initResult = await keycloak.init(initOptions);
        log.info(" Init method completed successfully:", {
          result: initResult,
          type: typeof initResult,
        });
      } catch (initError) {
        log.error("Keycloak: Init method threw error:", {
          error: initError,
          errorType: typeof initError,
          errorConstructor: initError?.constructor?.name,
          message: initError?.message,
          stack: initError?.stack,
          stringified: JSON.stringify(initError, null, 2),
        });
        throw initError;
      }

      this.authenticated = initResult;

      log.info(" Init result detailed:", {
        authenticated: this.authenticated,
        timeAfterInit: Date.now(),
        tokenExists: !!keycloak.token,
        tokenLength: keycloak.token?.length,
        refreshTokenExists: !!keycloak.refreshToken,
        idTokenExists: !!keycloak.idToken,
        tokenExpired: keycloak.isTokenExpired
          ? keycloak.isTokenExpired()
          : "method not available",
        timeSkew: keycloak.timeSkew,
        flow: keycloak.flow,
        responseMode: keycloak.responseMode,
        keycloakAuthenticated: keycloak.authenticated,
      });

      // Token expiration troubleshooting
      if (keycloak.token) {
        const tokenParsed = keycloak.tokenParsed;
        const now = Math.floor(Date.now() / 1000);
        log.info(" Token analysis:", {
          tokenIssued: tokenParsed?.iat,
          tokenExpires: tokenParsed?.exp,
          currentTime: now,
          timeUntilExpiry: tokenParsed?.exp ? tokenParsed.exp - now : null,
          isExpired: keycloak.isTokenExpired
            ? keycloak.isTokenExpired()
            : "method not available",
          timeSkew: keycloak.timeSkew,
          tokenPreview: keycloak.token.substring(0, 50) + "...",
        });
      }

      if (this.authenticated && keycloak.token) {
        log.info("Keycloak authentication successful");
        this.initStore();

        // Clean URL after successful authentication
        if (isCallback) {
          log.info(" Cleaning callback URL");
          setTimeout(() => {
            this.cleanUrlAfterCallback();
          }, 100);
        }
      } else {
        log.warn("Authentication failed or user not authenticated", {
          authenticated: this.authenticated,
          hasToken: !!keycloak.token,
          keycloakAuthenticated: keycloak.authenticated,
          loginRequired: keycloak.loginRequired,
          canCreateLoginUrl: !!keycloak.createLoginUrl,
          authServerUrl: keycloak.authServerUrl,
          realm: keycloak.realm,
          clientId: keycloak.clientId,
        });
      }
    } catch (initError) {
      log.error("Keycloak initialization error:", {
        error: initError,
        errorType: typeof initError,
        errorConstructor: initError?.constructor?.name,
        message: initError?.message,
        stack: initError?.stack,
        keycloakState: {
          authenticated: keycloak.authenticated,
          hasToken: !!keycloak.token,
          hasRefreshToken: !!keycloak.refreshToken,
          loginRequired: keycloak.loginRequired,
          authServerUrl: keycloak.authServerUrl,
          realm: keycloak.realm,
          clientId: keycloak.clientId,
        },
        isCallback,
        currentUrl: window.location.href,
        stringifiedError: JSON.stringify(
          initError,
          Object.getOwnPropertyNames(initError),
        ),
      });

      // PKCE troubleshooting
      if (initError?.message?.includes("code_verifier")) {
        log.error("PKCE Error detected:", {
          error: "PKCE code verifier issue",
          suggestion: "Check if PKCE is properly configured on Keycloak server",
          pkceMethod: "S256",
          possibleCause: "Code verifier/challenge mismatch or storage issue",
        });
      }

      // Fragment parsing troubleshooting
      if (
        initError?.message?.includes("fragment") ||
        initError?.message?.includes("parsing")
      ) {
        log.error("Fragment parsing error detected:", {
          error: "Fragment parsing issue",
          currentFragment: window.location.hash,
          suggestion:
            "Check if the callback URL contains valid OAuth parameters",
          possibleCause: "Malformed callback URL or missing parameters",
        });
      }

      if (isCallback) {
        log.info("Cleaning URL after failed callback");
        this.cleanUrlAfterCallback();
      }

      // Don't throw the error, let the app continue but mark as unauthenticated
      log.info(" Continuing with unauthenticated state after error");
    } finally {
      this.loading = false;
      log.info(" Init completed", {
        loading: this.loading,
        authenticated: this.authenticated,
        finalState: keycloak.authenticated,
        hasToken: !!keycloak.token,
        hasUser: !!this.user,
      });
    }
  }

  private cleanUrlAfterCallback(): void {
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      log.info(" URL cleaning:", {
        originalUrl: window.location.href,
        cleanUrl,
        hasState: window.history.state,
      });

      window.history.replaceState({}, document.title, cleanUrl);
      log.info("URL cleaned after authentication callback");
    } catch (error) {
      log.error("Failed to clean URL:", {
        error,
        message: error?.message,
        originalUrl: window.location.href,
      });
    }
  }

  private initStore(): void {
    const keycloak = this.getKeycloak();

    log.info(" InitStore called", {
      keycloakAuthenticated: keycloak.authenticated,
      hasToken: !!keycloak.token,
      hasIdToken: !!keycloak.idTokenParsed,
      hasRefreshToken: !!keycloak.refreshToken,
    });

    this.authenticated = keycloak.authenticated || false;

    if (keycloak.authenticated && keycloak.token && keycloak.idTokenParsed) {
      const tokens = {
        access: keycloak.token,
        refresh: keycloak.refreshToken || "",
      };

      log.info(" Token details:", {
        accessTokenLength: tokens.access?.length,
        hasRefreshToken: !!tokens.refresh,
        refreshTokenLength: tokens.refresh?.length,
        idTokenClaims: Object.keys(keycloak.idTokenParsed || {}),
      });

      this.authTokens = tokens;
      this.user = {
        sub: keycloak.idTokenParsed.sub,
        preferred_username: keycloak.idTokenParsed.preferred_username,
        email: keycloak.idTokenParsed.email,
        name: keycloak.idTokenParsed.name,
        // realm_access.roles lives in the access token, not the ID token
        realm_access: (keycloak.tokenParsed as any)?.realm_access,
        identityProvider: "keycloak",
      };

      log.info(" User created:", {
        hasSub: !!this.user.sub,
        hasUsername: !!this.user.preferred_username,
        hasEmail: !!this.user.email,
        hasName: !!this.user.name,
        userKeys: Object.keys(this.user).filter((key) => this.user[key]),
      });

      // Use auth store instead of localStorage
      authStore.initOauth(this.user, tokens, false);
      log.info("Keycloak store initialized successfully");
    } else {
      log.warn("Cannot init store - missing required data:", {
        authenticated: keycloak.authenticated,
        hasToken: !!keycloak.token,
        hasIdTokenParsed: !!keycloak.idTokenParsed,
      });
    }
  }

  private async refreshUserToken(): Promise<void> {
    const keycloak = this.getKeycloak();

    log.info(" Token refresh requested", {
      currentTokenExists: !!keycloak.token,
      isTokenExpired: keycloak.isTokenExpired(),
      timeSkew: keycloak.timeSkew,
      minValidity: 300,
    });

    try {
      const beforeRefresh = {
        tokenExists: !!keycloak.token,
        tokenExpired: keycloak.isTokenExpired(),
        refreshTokenExists: !!keycloak.refreshToken,
      };

      const refreshed = await keycloak.updateToken(300); // 5 minutes

      const afterRefresh = {
        refreshed,
        tokenExists: !!keycloak.token,
        tokenExpired: keycloak.isTokenExpired(),
        newTokenLength: keycloak.token?.length,
      };

      log.info(" Token refresh result:", {
        beforeRefresh,
        afterRefresh,
        timeOfRefresh: Date.now(),
      });

      if (refreshed) {
        this.initStore();
        log.info("Keycloak token refreshed successfully");
      } else {
        log.info("Token still valid, no refresh needed");
      }
    } catch (error) {
      log.error("Failed to refresh Keycloak token:", {
        error,
        message: error?.message,
        keycloakAuthenticated: keycloak.authenticated,
        hasRefreshToken: !!keycloak.refreshToken,
        possibleCause:
          "Refresh token expired or invalid, user may need to re-login",
      });
      throw error;
    }
  }

  private clearUserData(): void {
    log.info(" Clearing user data", {
      wasAuthenticated: this.authenticated,
      hadTokens: !!this.authTokens,
      hadUser: !!this.user,
    });

    this.authenticated = false;
    this.authTokens = null;
    this.user = null;
    // Use auth store instead of localStorage
    authStore.clearUserData();

    log.info("Keycloak: User data cleared");
  }

  async getIdentity(): Promise<Identity> {
    log.info(" GetIdentity called", {
      hasUser: !!this.user,
      hasTokens: !!this.authTokens,
      loading: this.loading,
      authenticated: this.authenticated,
    });

    const keycloak = this.getKeycloak();

    return {
      user: this.user,
      authTokens: this.authTokens,
      loading: this.loading,
      login: async () => {
        log.info("Initiating Keycloak login", {
          currentUrl: window.location.href,
          keycloakLoginUrl: keycloak.createLoginUrl
            ? "Available"
            : "Not available",
        });
        const idpHint = getEnvVar("VITE_IDP_HINT") || undefined;
        await keycloak.login({ idpHint });
      },
      logoutUser: () => {
        log.info("Logging out from Keycloak", {
          wasAuthenticated: keycloak.authenticated,
          redirectUri: window.location.origin,
        });

        this.clearUserData();
        if (keycloak.authenticated) {
          keycloak.logout({
            redirectUri: window.location.origin,
          });
        }
      },
      refreshToken: async () => {
        await this.refreshUserToken();
        return this.authTokens;
      },
    };
  }

  cleanup(): void {
    log.info("Cleanup called", {
      hadInitPromise: !!this.initializationPromise,
      wasInitAttempted: this.initializationAttempted,
    });

    this.initializationPromise = null;
    this.initializationAttempted = false;

    log.info("Keycloak: Cleanup completed");
  }
}

export const KeycloakAdapter = new KeycloakIdentityProvider();
