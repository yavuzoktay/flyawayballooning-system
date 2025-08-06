#!/bin/bash

echo "=== Fixing Permissions ==="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

echo "1. Setting proper ownership..."
sudo chown -R ec2-user:ec2-user .

echo "2. Setting proper permissions for client build..."
sudo chown -R nginx:nginx client/build
sudo chmod -R 755 client/build

echo "3. Setting proper permissions for server..."
sudo chown -R ec2-user:ec2-user server
sudo chmod -R 755 server

echo "4. Setting proper permissions for uploads..."
sudo chown -R ec2-user:ec2-user server/uploads
sudo chmod -R 755 server/uploads

echo "5. Setting proper permissions for nginx configuration..."
sudo chown root:root nginx.conf
sudo chmod 644 nginx.conf

echo "6. Restarting nginx..."
sudo systemctl restart nginx

echo "7. Restarting PM2..."
pm2 restart flyawayballooning-server

echo "8. Checking services..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

if pm2 list | grep -q "flyawayballooning-server.*online"; then
    echo "✅ Node.js application is running"
else
    echo "❌ Node.js application is not running"
fi

echo "=== Permissions fixed ===" 