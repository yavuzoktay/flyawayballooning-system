#!/bin/bash

echo "=========================================="
echo "=== Full Deployment Script (Backend + Frontend) ==="
echo "=========================================="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

echo ""
echo "1. Pulling latest code from Git..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi

echo ""
echo "2. Installing Backend Dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend npm install failed!"
    exit 1
fi
cd ..

echo ""
echo "3. Building Frontend..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend npm install failed!"
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
cd ..

echo ""
echo "4. Setting Permissions..."
sudo chown -R nginx:nginx client/build
sudo chmod -R 755 client/build
sudo chown -R ec2-user:ec2-user server
sudo chmod -R 755 server
sudo chown -R ec2-user:ec2-user server/uploads
sudo chmod -R 755 server/uploads

echo ""
echo "5. Updating Nginx Configuration..."
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

echo ""
echo "6. Restarting Nginx..."
sudo systemctl restart nginx
if [ $? -ne 0 ]; then
    echo "❌ Nginx restart failed!"
    exit 1
fi

echo ""
echo "7. Restarting Backend Server (PM2)..."
pm2 stop flyawayballooning-server 2>/dev/null || true
pm2 delete flyawayballooning-server 2>/dev/null || true
cd server
PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save
cd ..

echo ""
echo "8. Waiting for server to start..."
sleep 5

echo ""
echo "9. Checking Services..."

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    sudo systemctl status nginx
fi

# Check PM2
if pm2 list | grep -q "flyawayballooning-server.*online"; then
    echo "✅ Backend server (PM2) is running"
else
    echo "❌ Backend server (PM2) is not running"
    pm2 logs flyawayballooning-server --lines 20
fi

# Check Backend Health
echo ""
echo "10. Testing Backend Health..."
if curl -s http://localhost:3002/api/health > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    echo "PM2 logs:"
    pm2 logs flyawayballooning-server --lines 20
fi

echo ""
echo "=========================================="
echo "=== Deployment Completed ==="
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check the live site: https://flyawayballooning-system.com"
echo "2. Check PM2 logs: pm2 logs flyawayballooning-server"
echo "3. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""

