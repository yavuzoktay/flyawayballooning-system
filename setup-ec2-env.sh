#!/bin/bash

# EC2 Environment Setup Script for FlyAway Ballooning
# This script sets up the environment variables on the EC2 instance

echo "Setting up environment variables on EC2..."

# Navigate to the application directory
cd ~/flyawayballooning-system-backend/server

# Create .env file with test Stripe keys
cat > .env << 'EOF'
# Database Configuration
DB_HOST=trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=qumton-jeghuz-doKxy3
DB_NAME=trip_booking

# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_51HjVLCHwUKMuFjtpIAaHKDiWRCf3y6xXl4ZeVqRUefWCiNUsJdr93BPnvRvx69NZZV4HkgglpuOVUjI1X77lYNtk00vYeIs8qV
STRIPE_WEBHOOK_SECRET=whsec_d9486cdc4554cef4e53d8f65b95297cde986e5e64d99bda605521788d2d82595

# Server Configuration
PORT=3002
NODE_ENV=production
EOF

echo "Environment file created successfully!"

# Restart the application with PM2
echo "Restarting application with PM2..."
pm2 delete flyawayballooning-server 2>/dev/null || true
PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save

echo "Application restarted successfully!"
echo "Environment variables have been set up." 