#!/bin/sh
# =============================================================================
# Docker Entrypoint for Azure IPAM Frontend
# Substitutes environment variables at runtime
# =============================================================================

set -e

# Default API URL if not set
API_URL="${API_URL:-http://api:7071/api}"

# Create nginx config with API_URL substituted
# Use sed instead of envsubst to avoid breaking nginx variables like $http_upgrade
sed -i "s|\${API_URL}|${API_URL}|g" /etc/nginx/nginx.conf

# Generate runtime config.js for frontend environment variables
cat > /usr/share/nginx/html/config.js << EOF
window.__RUNTIME_CONFIG__ = {
  VITE_AZURE_TENANT_ID: "${VITE_AZURE_TENANT_ID:-}",
  VITE_AZURE_CLIENT_ID: "${VITE_AZURE_CLIENT_ID:-}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-/api}"
};
EOF

echo "Runtime configuration generated:"
cat /usr/share/nginx/html/config.js

# Execute the main command
exec "$@"
