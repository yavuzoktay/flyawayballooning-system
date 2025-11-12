# Backend Deployment Guide for Email Templates Feature

## Problem
The `/api/email-templates` endpoint returns 404 on the live site (https://flyawayballooning-system.com/) because the backend server hasn't been updated with the latest code changes.

## Solution
Deploy the updated backend code to the production server.

## Steps to Deploy

### Option 1: Automated Deployment (Recommended)

1. **SSH into the production server:**
   ```bash
   ssh ec2-user@34.205.25.8
   ```

2. **Navigate to the backend directory:**
   ```bash
   cd /home/ec2-user/flyawayballooning-system-backend/server
   ```

3. **Pull the latest changes:**
   ```bash
   git pull origin main
   ```

4. **Run the database migration for email templates:**
   ```bash
   mysql -u your_db_user -p trip_booking < create_email_templates_table.sql
   mysql -u your_db_user -p trip_booking < add_body_to_email_templates.sql
   ```

5. **Restart the backend server:**
   ```bash
   pm2 restart flyawayballooning-server
   ```

6. **Verify the deployment:**
   ```bash
   curl http://localhost:3002/api/email-templates
   ```

### Option 2: Manual File Upload

If the backend directory is not a git repository on the server:

1. **Create a deployment package locally:**
   ```bash
   cd /Users/yavuzoktay/Documents/FlyAwayBallooning/flyawayballooning-system/server
   tar -czf backend-update.tar.gz index.js package.json create_email_templates_table.sql add_body_to_email_templates.sql
   ```

2. **Upload to the server:**
   ```bash
   scp backend-update.tar.gz ec2-user@34.205.25.8:/home/ec2-user/
   ```

3. **SSH into the server and extract:**
   ```bash
   ssh ec2-user@34.205.25.8
   cd /home/ec2-user/flyawayballooning-system-backend/server
   tar -xzf /home/ec2-user/backend-update.tar.gz
   ```

4. **Run database migrations:**
   ```bash
   mysql -u your_db_user -p trip_booking < create_email_templates_table.sql
   mysql -u your_db_user -p trip_booking < add_body_to_email_templates.sql
   ```

5. **Restart the server:**
   ```bash
   pm2 restart flyawayballooning-server
   ```

## Database Migrations Required

The following SQL files need to be executed on the production database:

1. **create_email_templates_table.sql** - Creates the email_templates table
2. **add_body_to_email_templates.sql** - Adds the body column if it doesn't exist

## Verification Steps

After deployment, verify the following:

1. **Check API endpoint:**
   ```bash
   curl https://flyawayballooning-system.com/api/email-templates
   ```
   Should return: `{"success":true,"data":[...]}`

2. **Check PM2 status:**
   ```bash
   pm2 status
   ```

3. **Check logs for errors:**
   ```bash
   pm2 logs flyawayballooning-server --lines 50
   ```

4. **Test from frontend:**
   - Go to https://flyawayballooning-system.com/
   - Login to admin
   - Navigate to Settings page
   - Check if Email Templates section loads without errors

## Troubleshooting

### Issue: 404 Error persists
**Solution:** Ensure nginx is properly configured to proxy `/api/*` requests to the backend server on port 3002.

Check nginx config:
```bash
sudo nginx -t
sudo cat /etc/nginx/nginx.conf | grep -A 10 "location /api"
```

### Issue: Database connection errors
**Solution:** Verify database credentials in the backend `.env` file:
```bash
cat /home/ec2-user/flyawayballooning-system-backend/server/.env | grep DB_
```

### Issue: PM2 restart fails
**Solution:** Check PM2 logs and restart manually:
```bash
pm2 logs flyawayballooning-server --err --lines 50
pm2 delete flyawayballooning-server
cd /home/ec2-user/flyawayballooning-system-backend/server
PORT=3002 pm2 start index.js --name flyawayballooning-server
pm2 save
```

## Quick Deploy Command (All-in-One)

If you have SSH access, run this single command:

```bash
ssh ec2-user@34.205.25.8 'cd /home/ec2-user/flyawayballooning-system-backend/server && git pull origin main && npm install && pm2 restart flyawayballooning-server && sleep 3 && curl http://localhost:3002/api/email-templates'
```

## Contact

If issues persist, check:
- PM2 logs: `pm2 logs flyawayballooning-server`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- System logs: `sudo journalctl -xe`

