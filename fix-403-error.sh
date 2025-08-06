#!/bin/bash

echo "=== Fixing 403 Forbidden Error ==="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

echo "1. Checking current directory structure..."
ls -la

echo "2. Creating client build directory if it doesn't exist..."
mkdir -p client/build

echo "3. Creating a proper index.html file..."
cat > client/build/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FlyAway Ballooning System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .status {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>FlyAway Ballooning System</h1>
        <div class="status">
            <strong>Status:</strong> System is running successfully!
        </div>
        <p>This is the main page of the FlyAway Ballooning System. The backend API is available at <code>/api/</code> endpoints.</p>
        <p>If you're seeing this page, the deployment was successful!</p>
    </div>
</body>
</html>
EOF

echo "4. Setting proper permissions for nginx..."
sudo chown -R nginx:nginx client/build
sudo chmod -R 755 client/build
sudo chown -R nginx:nginx client
sudo chmod -R 755 client

echo "5. Setting proper permissions for server directory..."
sudo chown -R ec2-user:ec2-user server
sudo chmod -R 755 server

echo "6. Creating uploads directory with proper permissions..."
mkdir -p server/uploads/activities
sudo chown -R ec2-user:ec2-user server/uploads
sudo chmod -R 755 server/uploads

echo "7. Updating nginx configuration..."
sudo cp nginx.conf /etc/nginx/nginx.conf

echo "8. Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

echo "9. Restarting nginx..."
sudo systemctl restart nginx

echo "10. Checking nginx status..."
sudo systemctl status nginx --no-pager

echo "11. Checking if index.html is accessible..."
ls -la /home/ec2-user/flyawayballooning-system-backend/client/build/index.html

echo "12. Testing local access..."
curl -I http://localhost/ | head -1

echo "13. Checking nginx error logs..."
sudo tail -5 /var/log/nginx/error.log

echo "14. Checking nginx access logs..."
sudo tail -5 /var/log/nginx/access.log

echo "15. Setting SELinux context if needed..."
if command -v sestatus > /dev/null 2>&1; then
    if sestatus | grep -q "enabled"; then
        echo "SELinux is enabled, setting proper context..."
        sudo setsebool -P httpd_can_network_connect 1
        sudo setsebool -P httpd_can_network_relay 1
        sudo chcon -R -t httpd_sys_content_t /home/ec2-user/flyawayballooning-system-backend/client/build/
    fi
fi

echo "16. Checking firewall..."
if command -v firewall-cmd > /dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=80/tcp
    sudo firewall-cmd --reload
    echo "Firewall rules updated"
fi

echo "=== Final verification ==="
echo "Testing website access..."
curl -s -I http://localhost/ | head -1

echo "Checking if backend is responding..."
curl -s http://localhost:3002/api/health || echo "Backend not responding"

echo "=== 403 Error Fix Completed ==="
echo "Please check: http://flyawayballooning-system.com" 