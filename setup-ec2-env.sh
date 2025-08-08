#!/bin/bash

# EC2 Environment Setup Script for FlyAway Ballooning
# This script sets up the environment variables on the EC2 instance

echo "Setting up environment variables on EC2..."

# Navigate to the application directory
cd ~/flyawayballooning-system-backend/server

# Create .env file with placeholder values
cat > .env << 'EOF'
# Database Configuration
DB_HOST=trip-booking-database.c9mqyasow9hg.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=qumton-jeghuz-doKxy3
DB_NAME=trip_booking

# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Server Configuration
PORT=3002
NODE_ENV=production
EOF

echo "Please manually update the .env file with your actual Stripe keys:"
echo "1. Edit the .env file: nano .env"
echo "2. Replace 'your_stripe_secret_key_here' with your actual test secret key"
echo "3. Replace 'your_stripe_webhook_secret_here' with your actual webhook secret"
echo "4. Save and exit (Ctrl+X, Y, Enter)"
echo ""
echo "Then restart the application manually:"
echo "pm2 delete flyawayballooning-server"
echo "PORT=3002 pm2 start index.js --name flyawayballooning-server"
echo "pm2 save"

echo "Environment file created successfully!"

# Restart the application with PM2
echo "Restarting application with PM2..."
pm2 delete flyawayballooning-server 2>/dev/null || true
PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save

echo "Application restarted successfully!"
echo "Environment variables have been set up." 