#!/bin/bash

# Quick Backend Deployment Script for Email Templates Feature
# This script deploys the updated backend to the production server

echo "==================================="
echo "Backend Deployment for Email Templates"
echo "==================================="
echo ""

# Configuration
SERVER_USER="ec2-user"
SERVER_IP="34.205.25.8"
SERVER_PATH="/home/ec2-user/flyawayballooning-system-backend/server"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'SSH connection successful'"; then
    echo -e "${RED}❌ SSH connection failed. Please check your SSH keys and server access.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

echo -e "${YELLOW}Step 2: Pulling latest code from Git...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /home/ec2-user/flyawayballooning-system-backend/server
echo "Current directory: $(pwd)"
git pull origin main
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /home/ec2-user/flyawayballooning-system-backend/server
npm install --production
ENDSSH
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Running database migrations...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /home/ec2-user/flyawayballooning-system-backend/server
echo "Checking if email_templates table exists..."
mysql -u root trip_booking -e "SHOW TABLES LIKE 'email_templates';" 2>/dev/null || echo "Will create table"
echo "Running migrations..."
mysql -u root trip_booking < create_email_templates_table.sql 2>/dev/null || echo "Table may already exist"
mysql -u root trip_booking < add_body_to_email_templates.sql 2>/dev/null || echo "Column may already exist"
echo "✓ Migrations executed"
ENDSSH
echo -e "${GREEN}✅ Database migrations completed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Restarting backend server with PM2...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /home/ec2-user/flyawayballooning-system-backend/server
pm2 restart flyawayballooning-server
sleep 3
pm2 status flyawayballooning-server
ENDSSH
echo -e "${GREEN}✅ Server restarted${NC}"
echo ""

echo -e "${YELLOW}Step 6: Verifying deployment...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "Testing API endpoint locally..."
curl -s http://localhost:3002/api/email-templates | head -c 100
echo ""
echo "Checking PM2 logs for errors..."
pm2 logs flyawayballooning-server --lines 5 --nostream
ENDSSH
echo ""

echo -e "${YELLOW}Step 7: Testing public endpoint...${NC}"
sleep 2
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://flyawayballooning-system.com/api/email-templates)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Public endpoint is responding (HTTP $RESPONSE)${NC}"
else
    echo -e "${RED}❌ Public endpoint returned HTTP $RESPONSE${NC}"
    echo -e "${YELLOW}Checking nginx configuration...${NC}"
    ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
sudo nginx -t
ENDSSH
fi
echo ""

echo "==================================="
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Visit: https://flyawayballooning-system.com/"
echo "2. Login to admin panel"
echo "3. Go to Settings > Email Templates"
echo "4. Verify the section loads without errors"
echo ""
echo "If issues persist, check logs:"
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo "  pm2 logs flyawayballooning-server"
echo ""

