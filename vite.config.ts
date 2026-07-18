
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // Remove hardcoded environment variables for production builds
      ...(mode === 'development' ? {
        VITE_IDENTITY_PROVIDER: JSON.stringify(process.env.VITE_IDENTITY_PROVIDER),
        VITE_SSO_SERVER_URL: JSON.stringify(process.env.VITE_SSO_SERVER_URL),
        VITE_OAUTH_REALM: JSON.stringify(process.env.VITE_OAUTH_REALM),
        VITE_OAUTH_CLIENT_ID: JSON.stringify(process.env.VITE_OAUTH_CLIENT_ID),
        VITE_OLLAMA_API_URL: JSON.stringify(process.env.VITE_OLLAMA_API_URL),
        VITE_API_URL: JSON.stringify(process.env.VITE_API_URL),
        VITE_AVAILABLE_MODELS: JSON.stringify(process.env.VITE_AVAILABLE_MODELS),
      } : {})
    },
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/ollama': {
          target: env.VITE_OLLAMA_API_URL,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/ollama/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      // Allow all hosts in preview mode for Kubernetes environments
      strictPort: true,
      cors: true,
      hmr: {
        host: "0.0.0.0"
      }
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      // you might want to disable it, if you don't have tests that rely on CSS
      // since parsing CSS is slow
      css: true,
      testTimeout: 30000,
      reporters: ['default', 'vitest-sonar-reporter', 'vitest-ui-reporter'],
      outputFile: {
        'vitest-sonar-reporter': 'test-report.xml',
      },
    },
  };
});
