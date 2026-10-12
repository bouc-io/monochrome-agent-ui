

# Stage 1: Build Stage
FROM node:22-alpine AS build


# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (without environment variables)
RUN npm run build

# Stage 2: Production Stage
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install serve globally and envsubst for environment variable substitution
RUN npm install -g serve && apk add --no-cache gettext

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Ensure silent-check-sso.html exists in the build output
RUN if [ ! -f /app/dist/silent-check-sso.html ]; then \
    echo '<!DOCTYPE html><html><head><title>Silent Check SSO</title></head><body><script>parent.postMessage(location.href, location.origin);</script></body></html>' > /app/dist/silent-check-sso.html; \
    fi

# Create the entrypoint script directly in the container
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst < /app/dist/env.template.js > /app/dist/env.js' >> /docker-entrypoint.sh && \
    echo 'sed -i "s|</head>|  <script src=\"/env.js\"></script>\n  </head>|g" /app/dist/index.html' >> /docker-entrypoint.sh && \
    echo 'exec serve -s dist -l 3000' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Create env.template.js for runtime environment injection
RUN echo 'window.ENV = {' > /app/dist/env.template.js && \
    echo '  LOG_LEVEL: "${LOG_LEVEL}",' >> /app/dist/env.template.js && \
    echo '  VITE_IDENTITY_PROVIDER: "${VITE_IDENTITY_PROVIDER}",' >> /app/dist/env.template.js && \
    echo '  VITE_SSO_SERVER_URL: "${VITE_SSO_SERVER_URL}",' >> /app/dist/env.template.js && \
    echo '  VITE_OAUTH_REALM: "${VITE_OAUTH_REALM}",' >> /app/dist/env.template.js && \
    echo '  VITE_OAUTH_CLIENT_ID: "${VITE_OAUTH_CLIENT_ID}",' >> /app/dist/env.template.js && \
    echo '  VITE_OLLAMA_API_URL: "${VITE_OLLAMA_API_URL}",' >> /app/dist/env.template.js && \
    echo '  VITE_API_URL: "${VITE_API_URL}"' >> /app/dist/env.template.js && \
    echo '};' >> /app/dist/env.template.js

# Expose port 3000
EXPOSE 3000

# Use the entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
