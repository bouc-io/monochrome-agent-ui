
#!/bin/sh

# Substitute environment variables in the template and create env.js
envsubst < /app/dist/env.template.js > /app/dist/env.js

# Inject the env.js script into index.html
sed -i 's|</head>|  <script src="/env.js"></script>\n  </head>|g' /app/dist/index.html

# Start the application
exec serve -s dist -l 3000
