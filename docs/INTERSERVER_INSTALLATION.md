# Complete Installation Guide for InterServer Web Hosting

This comprehensive guide walks you through deploying the Event Management System to your InterServer web hosting with a private domain.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Installation Steps](#installation-steps)
4. [Database Setup](#database-setup)
5. [Backend Configuration](#backend-configuration)
6. [Frontend Deployment](#frontend-deployment)
7. [Domain & SSL Configuration](#domain--ssl-configuration)
8. [Testing & Verification](#testing--verification)
9. [Maintenance & Updates](#maintenance--updates)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need

1. **InterServer VPS Hosting Account**
   - Standard VPS plan (minimum 2GB RAM recommended)
   - **Important**: Shared hosting does NOT support Node.js applications
   - You MUST use a VPS (Virtual Private Server) plan

2. **Domain Name**
   - Your private domain pointed to InterServer nameservers
   - DNS propagation completed (usually 24-48 hours)

3. **SSH Access**
   - Root or sudo user credentials
   - SSH client (Terminal on Mac/Linux, PuTTY on Windows)

4. **Local Development Environment**
   - Node.js 18+ installed
   - Git (for code management)
   - Terminal/Command line access

### Recommended InterServer VPS Specs

- **CPU**: 2 vCPU cores
- **RAM**: 2GB minimum (4GB recommended)
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Bandwidth**: Unmetered

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR DOMAIN                          │
│              (https://yourdomain.com)                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  NGINX WEB SERVER                       │
│  - Serves static frontend files                        │
│  - Reverse proxy to backend API                        │
│  - SSL/TLS termination                                 │
└──────────┬────────────────────────┬─────────────────────┘
           │                        │
           │ /api/*                 │ /*
           ▼                        ▼
┌──────────────────────┐   ┌──────────────────────────────┐
│  NODE.JS BACKEND     │   │  REACT FRONTEND              │
│  (Express Server)    │   │  (Static HTML/JS/CSS)        │
│  - Port 3000         │   │  - /var/www/html             │
│  - REST API          │   │  - Built with Vite           │
│  - JWT Auth          │   │  - Single Page App           │
└──────────┬───────────┘   └──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│              MYSQL DATABASE                              │
│  - event_manager database                               │
│  - events, users, licenses tables                       │
│  - Port 3306 (localhost only)                           │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS
- Zustand (state management)
- React Router

**Backend:**
- Node.js 18+
- Express.js framework
- MySQL database
- JWT authentication
- PM2 process manager

**Infrastructure:**
- Ubuntu 22.04 LTS
- Nginx web server
- Let's Encrypt SSL certificates
- UFW firewall

---

## Installation Steps

### Step 1: Initial VPS Setup

#### 1.1 Order and Provision VPS

1. Log into your InterServer account at https://my.interserver.net
2. Navigate to **VPS Hosting** section
3. Order a Standard VPS plan
4. Select **Ubuntu 22.04 LTS** as the operating system
5. Complete the order and wait for provisioning (5-15 minutes)
6. Note your VPS IP address from the control panel

#### 1.2 Connect via SSH

```bash
# Replace YOUR_SERVER_IP with your actual VPS IP
ssh root@YOUR_SERVER_IP
```

Enter your root password when prompted (sent to your email).

#### 1.3 Update System Packages

```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential ufw
```

#### 1.4 Create Non-Root User (Security Best Practice)

```bash
# Create deployment user
adduser deploy

# Add to sudo group
usermod -aG sudo deploy

# Switch to new user
su - deploy
```

From now on, use this `deploy` user for all operations.

#### 1.5 Configure Firewall

```bash
# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 2: Install Node.js

#### 2.1 Install NVM (Node Version Manager)

```bash
# Download and install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM
source ~/.bashrc

# Verify installation
nvm --version
```

#### 2.2 Install Node.js LTS

```bash
# Install latest LTS version
nvm install --lts

# Set as default
nvm use --lts

# Verify installation
node --version  # Should show v18.x or higher
npm --version   # Should show v9.x or higher
```

#### 2.3 Install PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version

# Setup PM2 startup script
pm2 startup systemd
# Run the command that PM2 outputs
```

---

### Step 3: Install MySQL Database

#### 3.1 Install MySQL Server

```bash
# Install MySQL
sudo apt install -y mysql-server

# Start MySQL service
sudo systemctl start mysql

# Enable on boot
sudo systemctl enable mysql

# Verify service is running
sudo systemctl status mysql
```

#### 3.2 Secure MySQL Installation

```bash
# Run security script
sudo mysql_secure_installation
```

Follow the prompts:
- Set root password: **YES** (choose a strong password)
- Remove anonymous users: **YES**
- Disallow root login remotely: **YES**
- Remove test database: **YES**
- Reload privilege tables: **YES**

#### 3.3 Create Application Database

```bash
# Log into MySQL as root
sudo mysql
```

Inside MySQL shell, run:

```sql
-- Create database
CREATE DATABASE event_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user
CREATE USER 'event_manager'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON event_manager.* TO 'event_manager'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify database
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

**Important**: Replace `YOUR_STRONG_PASSWORD_HERE` with a secure password and save it securely.

---

### Step 4: Install Nginx Web Server

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx

# Enable on boot
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx

# Test from browser: http://YOUR_SERVER_IP
# You should see the Nginx default page
```

---

### Step 5: Deploy Backend Application

#### 5.1 Upload Application Code

**Option A: Using Git (Recommended)**

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone YOUR_REPOSITORY_URL event-manager

# Or download as ZIP and extract
# wget https://your-source/event-manager.zip
# unzip event-manager.zip
```

**Option B: Using SFTP**

Use FileZilla or similar SFTP client:
1. Connect to your server (SFTP, port 22)
2. Upload entire project folder to `/home/deploy/event-manager`

#### 5.2 Install Backend Dependencies

```bash
# Navigate to backend folder
cd ~/event-manager/backend-interserver

# Install dependencies
npm install

# Verify no errors
```

#### 5.3 Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

Update the following values:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_manager
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE  # From Step 3.3
DB_NAME=event_manager
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Secret (generate a random string)
JWT_SECRET=your_secure_random_jwt_secret_minimum_32_characters

# Optional: CORS origins (your domain)
CORS_ORIGIN=https://yourdomain.com
```

**Generate JWT Secret:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save and exit (Ctrl+X, then Y, then Enter).

#### 5.4 Test Backend Manually

```bash
# Start backend in development mode
npm start
```

You should see:
```
Server running on port 3000
Database connected successfully
```

Press Ctrl+C to stop the test server.

#### 5.5 Start Backend with PM2

```bash
# Start using PM2 with ecosystem file
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Verify application is running
pm2 status
pm2 logs event-manager-interserver

# Check application health
curl http://localhost:3000/api/health
# Should return: {"status":"ok","database":"connected"}
```

---

### Step 6: Build and Deploy Frontend

#### 6.1 Update Frontend Configuration

On your **local machine**, update the API endpoint:

```bash
# Edit frontend API configuration
nano src/config/api.ts
```

Change the API base URL:

```typescript
// Update this section
const API_CONFIG = {
  production: {
    baseURL: 'https://yourdomain.com', // Your domain
  },
  // ... rest of config
};
```

#### 6.2 Build Frontend

Still on your **local machine**:

```bash
# Install dependencies (if not done)
npm install

# Build for production
npm run build
```

This creates an optimized build in the `dist/` folder.

#### 6.3 Upload Frontend to Server

**Option A: Using SFTP**

1. Connect via SFTP
2. Upload entire `dist/` folder to `/home/deploy/event-manager-frontend`

**Option B: Using SCP**

```bash
# From your local machine, in project root
scp -r dist/ deploy@YOUR_SERVER_IP:/home/deploy/event-manager-frontend
```

#### 6.4 Move Frontend to Web Root

On the **server**:

```bash
# Create web directory
sudo mkdir -p /var/www/event-manager

# Copy frontend files
sudo cp -r ~/event-manager-frontend/* /var/www/event-manager/

# Set proper ownership
sudo chown -R www-data:www-data /var/www/event-manager

# Set proper permissions
sudo chmod -R 755 /var/www/event-manager
```

---

### Step 7: Configure Nginx

#### 7.1 Create Nginx Configuration

```bash
# Create new site configuration
sudo nano /etc/nginx/sites-available/event-manager
```

Paste the following configuration (replace `yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend root directory
    root /var/www/event-manager;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API reverse proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Frontend - React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable logging for favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # Disable logging for robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
}
```

Save and exit (Ctrl+X, Y, Enter).

#### 7.2 Enable Site Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/event-manager /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

#### 7.3 Verify Configuration

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error log if issues
sudo tail -f /var/log/nginx/error.log
```

---

## Database Setup

The backend application automatically creates necessary tables on first connection. To verify:

```bash
# Log into MySQL
sudo mysql event_manager

# Check tables
SHOW TABLES;

# Should see:
# +---------------------------+
# | Tables_in_event_manager   |
# +---------------------------+
# | events                    |
# | users                     |
# | licenses                  |
# +---------------------------+

# Exit MySQL
EXIT;
```

---

## Domain & SSL Configuration

### Step 8.1: Point Domain to Server

In your domain registrar's control panel:

1. Update **A Record** to point to your VPS IP:
   ```
   Type: A
   Name: @
   Value: YOUR_SERVER_IP
   TTL: 3600
   ```

2. Update **CNAME Record** for www subdomain:
   ```
   Type: CNAME
   Name: www
   Value: yourdomain.com
   TTL: 3600
   ```

3. Wait for DNS propagation (5 minutes to 48 hours)

4. Verify DNS:
   ```bash
   # From your local machine
   dig yourdomain.com
   dig www.yourdomain.com
   ```

### Step 8.2: Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)

# Verify certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

Your site should now be accessible at `https://yourdomain.com` with a valid SSL certificate!

---

## Testing & Verification

### Step 9.1: Backend API Tests

```bash
# Health check
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"ok","database":"connected"}

# Database test
curl https://yourdomain.com/api/database/test

# Expected response:
# {"success":true,"message":"Database connection successful"}
```

### Step 9.2: Frontend Tests

Open your browser and navigate to `https://yourdomain.com`

**Test Checklist:**

✅ **Login Screen**
- [ ] Login form displays correctly
- [ ] Can create new account
- [ ] Login with credentials works
- [ ] JWT token stored in localStorage

✅ **Calendar View**
- [ ] Monthly calendar renders
- [ ] Can navigate between months
- [ ] Sample events display (if loaded)

✅ **Event Management**
- [ ] Can create new event
- [ ] Can edit existing event
- [ ] Can delete event
- [ ] Events persist after page reload

✅ **Search & Filter**
- [ ] Search by name works
- [ ] Search by phone works
- [ ] Filter by venue works
- [ ] Filter by status works

✅ **Responsive Design**
- [ ] Works on desktop
- [ ] Works on tablet
- [ ] Works on mobile

### Step 9.3: Backend Logs

```bash
# Check PM2 logs
pm2 logs event-manager-interserver

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

---

## Maintenance & Updates

### Updating Backend Code

```bash
# Navigate to backend directory
cd ~/event-manager/backend-interserver

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart application
pm2 restart event-manager-interserver

# Check status
pm2 status
```

### Updating Frontend Code

```bash
# On local machine: rebuild
npm run build

# Upload new dist/ folder to server
scp -r dist/* deploy@YOUR_SERVER_IP:/home/deploy/event-manager-frontend/

# On server: copy to web root
sudo cp -r ~/event-manager-frontend/* /var/www/event-manager/

# Clear browser cache and test
```

### Database Backups

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup
mysqldump -u event_manager -p event_manager > ~/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Automate daily backups (crontab)
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * mysqldump -u event_manager -pYOUR_PASSWORD event_manager > ~/backups/backup_$(date +\%Y\%m\%d).sql
```

### Restore Database Backup

```bash
# Restore from backup
mysql -u event_manager -p event_manager < ~/backups/backup_20250101.sql
```

### Monitor Server Resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# PM2 monitoring
pm2 monit

# Nginx status
sudo systemctl status nginx

# MySQL status
sudo systemctl status mysql
```

---

## Troubleshooting

### Backend Not Starting

**Check PM2 logs:**
```bash
pm2 logs event-manager-interserver --lines 100
```

**Common issues:**
- Database connection failed: Check MySQL credentials in `.env`
- Port 3000 already in use: Kill the process using `lsof -i :3000`
- Missing dependencies: Run `npm install` again

### Frontend Not Loading

**Check Nginx configuration:**
```bash
sudo nginx -t
```

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Common issues:**
- 404 errors: Check file paths in Nginx config
- 502 Bad Gateway: Backend not running (check PM2)
- CORS errors: Update `CORS_ORIGIN` in backend `.env`

### Database Connection Issues

**Test database connection:**
```bash
# Try connecting manually
mysql -u event_manager -p

# If connection fails, check:
sudo systemctl status mysql
sudo tail -f /var/log/mysql/error.log
```

**Common issues:**
- Access denied: Check username/password in `.env`
- Can't connect to socket: MySQL service not running
- Database doesn't exist: Re-create database (Step 3.3)

### SSL Certificate Issues

**Check certificate status:**
```bash
sudo certbot certificates
```

**Renew certificate manually:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

**Common issues:**
- Challenge failed: Check domain DNS
- Port 80 blocked: Check firewall (ufw status)
- Certificate expired: Run `certbot renew`

### Performance Issues

**Check server resources:**
```bash
# Overall system
top

# Disk usage
df -h

# Memory usage
free -h

# Nginx connections
sudo netstat -plant | grep nginx
```

**Optimize:**
- Increase PM2 instances: `pm2 scale event-manager-interserver 2`
- Enable Nginx caching
- Upgrade VPS plan if needed

---

## Support Resources

### InterServer Support
- **Email**: support@interserver.net
- **Phone**: 1-888-894-0697
- **Live Chat**: https://www.interserver.net
- **Control Panel**: https://my.interserver.net

### Documentation Links
- InterServer VPS Guide: https://www.interserver.net/tips/kb/
- Ubuntu Server Guide: https://ubuntu.com/server/docs
- Nginx Documentation: https://nginx.org/en/docs/
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- MySQL Documentation: https://dev.mysql.com/doc/

### Community Forums
- InterServer Forum: https://forum.interserver.net
- Stack Overflow: https://stackoverflow.com

---

## Summary

Congratulations! You have successfully deployed the Event Management System on InterServer VPS hosting.

**Your setup includes:**
- ✅ Node.js backend (Express) running on PM2
- ✅ MySQL database with proper tables
- ✅ React frontend optimized and deployed
- ✅ Nginx reverse proxy and static file serving
- ✅ SSL certificate from Let's Encrypt
- ✅ Firewall protection (UFW)
- ✅ Automatic process management (PM2)
- ✅ Production-ready environment

**Access your application:**
- **Frontend**: https://yourdomain.com
- **Backend API**: https://yourdomain.com/api
- **Health Check**: https://yourdomain.com/api/health

**Next steps:**
1. Set up automated database backups
2. Configure monitoring alerts
3. Set up log rotation
4. Plan regular updates and maintenance
5. Consider setting up staging environment

---

**Document Version**: 1.0
**Last Updated**: 2025-10-03
**Maintainer**: Event Manager Development Team
