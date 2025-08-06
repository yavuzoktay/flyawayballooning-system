#!/bin/bash

echo "=== Deploying Backend ==="

# Navigate to the backend directory
cd /home/ec2-user/flyawayballooning-system-backend

# Navigate to server directory
cd server

# Install dependencies if needed
echo "Installing server dependencies..."
npm install

# Create uploads directory if it doesn't exist
echo "Creating uploads directory..."
mkdir -p uploads
mkdir -p uploads/activities

# Set proper permissions
echo "Setting permissions..."
chmod 755 uploads
chmod 755 uploads/activities

# Stop the current PM2 process if running
echo "Stopping current PM2 process..."
pm2 stop flyawayballooning-server 2>/dev/null || true
pm2 delete flyawayballooning-server 2>/dev/null || true

# Start the server with PM2
echo "Starting server with PM2..."
PORT=3002 pm2 start index.js --name flyawayballooning-server

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
echo "Checking server status..."
if curl -s http://localhost:3002/api/health > /dev/null; then
    echo "✅ Backend server is responding"
else
    echo "❌ Backend server is not responding"
    echo "Checking PM2 logs..."
    pm2 logs flyawayballooning-server --lines 10
fi

echo "=== Backend deployment completed ===" 