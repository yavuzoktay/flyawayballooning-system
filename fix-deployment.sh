#!/bin/bash

echo "=== Fixing Deployment Issues ==="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

# Create client build directory if it doesn't exist
echo "Creating client build directory..."
mkdir -p client/build

# Create a basic index.html in client/build if it doesn't exist
if [ ! -f "client/build/index.html" ]; then
    echo "Creating basic index.html..."
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

# Set proper permissions for nginx
echo "Setting proper permissions..."
sudo chown -R nginx:nginx /home/ec2-user/flyawayballooning-system-backend/client/build
sudo chmod -R 755 /home/ec2-user/flyawayballooning-system-backend/client/build

# Set proper permissions for server directory
sudo chown -R ec2-user:ec2-user /home/ec2-user/flyawayballooning-system-backend/server
sudo chmod -R 755 /home/ec2-user/flyawayballooning-system-backend/server

# Create uploads directory with proper permissions
mkdir -p /home/ec2-user/flyawayballooning-system-backend/server/uploads
sudo chown -R ec2-user:ec2-user /home/ec2-user/flyawayballooning-system-backend/server/uploads
sudo chmod -R 755 /home/ec2-user/flyawayballooning-system-backend/server/uploads

# Restart nginx
echo "Restarting nginx..."
sudo systemctl restart nginx

# Restart the Node.js application
echo "Restarting Node.js application..."
pm2 restart flyawayballooning-server

echo "=== Deployment fixes completed ==="
echo "Checking if services are running..."

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

echo "=== Final verification ==="
echo "Checking if index.html exists and is accessible:"
ls -la /home/ec2-user/flyawayballooning-system-backend/client/build/index.html

echo "Checking nginx configuration:"
sudo nginx -t

echo "Checking backend health:"
curl -s http://localhost:3002/api/health || echo "Backend not responding" 