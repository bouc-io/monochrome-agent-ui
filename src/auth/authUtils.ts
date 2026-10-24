import { IdentityProvider } from "./types";
import logger from "@/lib/logger";

const log = logger.child("Auth");

export const getEnvVar = (key: string): string => {
  const value = window.ENV?.[key] || import.meta.env[key] || "";

  log.trace("env var check:", key, {
    source: window.ENV?.[key]
      ? "window.ENV"
      : import.meta.env[key]
        ? "import.meta.env"
        : "default",
    valueLength: value?.length,
  });

  return value;
};

export const isValidJWT = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    log.debug("JWT validation: empty or non-string token");
    return false;
  }

  const parts = token.split(".");
  const isValid = parts.length === 3 && parts.every((part) => part.length > 0);

  log.debug("JWT validation:", { partsCount: parts.length, isValid });

  return isValid;
};

export const isKeycloakCallback = () => {
  const url = new URL(window.location.href);
  const hasCode = url.searchParams.has("code") || url.searchParams.has("state");
  const hasFragment =
    url.hash.includes("code=") ||
    url.hash.includes("state=") ||
    url.hash.includes("access_token=");

  const isCallback = hasCode || hasFragment;
  log.debug(
    "Keycloak callback detection:",
    isCallback ? "IS_CALLBACK" : "NOT_CALLBACK",
  );

  return isCallback;
};

export const getIdentityProvider = (): IdentityProvider => {
  const provider = getEnvVar("VITE_IDENTITY_PROVIDER").toLowerCase();
  const validProviders = ["keycloak", "auth0", "okta", "stub"];

  if (validProviders.includes(provider)) {
    log.info("Identity provider:", provider);
    return provider as IdentityProvider;
  }

  log.warn("Invalid or missing VITE_IDENTITY_PROVIDER, defaulting to stub");
  return "stub";
};
