import axiosInstance from "./api";
import logger from "./logger";

const log = logger.child("Interceptor");

const setup = (store) => {
  log.debug("Setting up interceptors:", {
    authenticated: store?.authenticated,
    hasTokens: !!store?.authTokens,
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      if (store.authenticated && store.authTokens?.access) {
        const token = store.authTokens.access;
        config.headers["x-auth-request-access-token"] = token;
        config.headers["Authorization"] = `Bearer ${token}`;
        log.trace("Token added to request:", config.url);
      } else {
        log.debug("No token for request:", config.url);
      }

      return config;
    },
    (error) => {
      log.error(
        "Request interceptor error:",
        error?.message,
        error?.config?.url,
      );
      return Promise.reject(error);
    },
  );

  axiosInstance.interceptors.response.use(
    (res) => {
      log.trace("Response OK:", res.status, res.config?.url);
      return res;
    },
    async (error) => {
      const oriConfig = error.config;
      const status = error.response?.status;

      log.warn("Response error:", status, oriConfig?.url, {
        isRetry: !!oriConfig?._retry,
      });

      if (status === 401 && !oriConfig._retry) {
        log.info("401 detected, attempting token refresh for:", oriConfig.url);
        oriConfig._retry = true;

        try {
          const newTokens = await store.refreshUserToken();

          log.debug("Token refresh result:", {
            hasNewTokens: !!newTokens?.access,
          });

          if (newTokens?.access) {
            oriConfig.headers["x-auth-request-access-token"] = newTokens.access;
            oriConfig.headers["Authorization"] = `Bearer ${newTokens.access}`;
            log.info("Retrying request with refreshed token:", oriConfig.url);
          }

          return axiosInstance(oriConfig);
        } catch (_error) {
          log.error("Token refresh failed:", _error?.message);
          return Promise.reject(_error);
        }
      }

      return Promise.reject(error);
    },
  );

  log.info("✅ Token interceptors initialized");
};

export default setup;
