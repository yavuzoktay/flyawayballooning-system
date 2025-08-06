#!/bin/bash

echo "=== Comprehensive EC2 Deployment Fix ==="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

echo "1. Creating necessary directories..."
mkdir -p client/build
mkdir -p server/uploads/activities

echo "2. Creating basic index.html if it doesn't exist..."
if [ ! -f "client/build/index.html" ]; then
    cat > client/build/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FlyAway Ballooning System</title>
</head>
<body>
    <div id="root">
        <h1>FlyAway Ballooning System</h1>
        <p>System is being deployed. Please wait...</p>
    </div>
</body>
</html>
EOF
fi

echo "3. Setting proper permissions..."
sudo chown -R nginx:nginx client/build
sudo chmod -R 755 client/build
sudo chown -R ec2-user:ec2-user server
sudo chmod -R 755 server
sudo chown -R ec2-user:ec2-user server/uploads
sudo chmod -R 755 server/uploads

echo "4. Updating nginx configuration..."
sudo cp nginx.conf /etc/nginx/nginx.conf

echo "5. Testing nginx configuration..."
sudo nginx -t

echo "6. Restarting nginx..."
sudo systemctl restart nginx

echo "7. Stopping current PM2 processes..."
pm2 stop flyawayballooning-server 2>/dev/null || true
pm2 delete flyawayballooning-server 2>/dev/null || true

echo "8. Installing server dependencies..."
cd server
npm install

echo "9. Starting server with PM2..."
PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save

echo "10. Waiting for server to start..."
sleep 5

echo "11. Checking services..."

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

# Check if the Node.js app is running
if pm2 list | grep -q "flyawayballooning-server.*online"; then
    echo "✅ Node.js application is running"
else
    echo "❌ Node.js application is not running"
fi

echo "12. Final verification..."
echo "Checking if index.html exists and is accessible:"
ls -la /home/ec2-user/flyawayballooning-system-backend/client/build/index.html

echo "Checking backend health:"
curl -s http://localhost:3002/api/health || echo "Backend not responding"

echo "=== Deployment fix completed ===" 