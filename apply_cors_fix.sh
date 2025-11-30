#!/bin/bash

echo "=== Applying Nginx CORS Fix ==="

# 1. Pull latest changes
echo "1. Pulling latest changes from git..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Please check your git status."
    exit 1
fi

# 2. Copy nginx config
echo "2. Updating Nginx configuration..."
if [ -f "nginx.conf" ]; then
    sudo cp nginx.conf /etc/nginx/nginx.conf
    echo "✅ Copied nginx.conf to /etc/nginx/nginx.conf"
else
    echo "❌ nginx.conf not found in current directory!"
    exit 1
fi

# 3. Test configuration
echo "3. Testing Nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed! Reverting..."
    # Optional: revert logic if we had a backup
    exit 1
fi

# 4. Reload Nginx
echo "4. Reloading Nginx..."
sudo systemctl reload nginx

if [ $? -ne 0 ]; then
    echo "❌ Failed to reload Nginx!"
    exit 1
fi

echo "✅ Nginx reloaded successfully."

# 5. Verify locally
echo "5. Verifying CORS headers locally..."
RESPONSE=$(curl -I -s -H "Origin: http://127.0.0.1:9292" http://127.0.0.1/api/voucher-types)

if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    echo "✅ SUCCESS: Access-Control-Allow-Origin header found!"
    echo "Debug Headers:"
    echo "$RESPONSE" | grep "X-Debug"
else
    echo "⚠️ WARNING: Access-Control-Allow-Origin header NOT found in local test."
    echo "Full Response Headers:"
    echo "$RESPONSE"
fi

echo "=== Fix Application Completed ==="
