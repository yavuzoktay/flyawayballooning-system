#!/bin/bash

echo "=== Deploying Frontend ==="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

# Navigate to client directory
cd client

# Install dependencies if needed
echo "Installing client dependencies..."
npm install

# Build the React application
echo "Building React application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    
    # Set proper permissions for the build directory
    echo "Setting permissions..."
    sudo chown -R nginx:nginx build
    sudo chmod -R 755 build
    
    # Restart nginx to pick up changes
    echo "Restarting nginx..."
    sudo systemctl restart nginx
    
    echo "✅ Frontend deployment completed"
else
    echo "❌ Build failed"
    exit 1
fi

echo "=== Frontend deployment completed ===" 