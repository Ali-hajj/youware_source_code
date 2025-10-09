# Event Management System - InterServer VPS Deployment Guide

This guide helps you deploy the Event Management System on an InterServer VPS (Virtual Private Server).

## Prerequisites

1. **InterServer VPS Plan** (Standard VPS with at least 2GB RAM recommended)
2. **Operating System**: Ubuntu 22.04 LTS (choose during VPS provisioning)
3. **Root SSH Access** to the VPS
4. **Domain Name** (optional, but needed for HTTPS)

## Step 1: Provision & Access Your InterServer VPS

1. Log into the InterServer control panel and order a Standard VPS.
2. Select **Ubuntu 22.04 LTS** as the operating system image.
3. Once the VPS is active, note its public IP address.
4. Connect via SSH:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

### Create a Non-Root User (Recommended)
```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### Configure a Basic Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
```

## Step 2: Install Server Dependencies

### Install NVM & Node.js LTS
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

### Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### Install MySQL Server
```bash
sudo apt update
sudo apt install mysql-server -y
sudo mysql_secure_installation
```
Follow the prompts to set a strong root password and secure MySQL.

### Install Nginx (Reverse Proxy)
```bash
sudo apt install nginx -y
```

## Step 3: Prepare the Application Code

### Upload the Project
Copy the repository to the VPS. Example using Git:
```bash
cd ~
git clone YOUR_REPOSITORY_URL event-manager
cd event-manager/backend-interserver
```

Alternatively, upload via SFTP or rsync.

### Install Backend Dependencies
```bash
npm install
```

### Build & Upload the Frontend
On your local machine:
```bash
npm install
npm run build
```
Upload the `dist/` folder to the server (e.g., to `/var/www/event-manager-frontend`).

## Step 4: Configure Environment Variables

Copy the sample env file and edit values:
```bash
cp .env.example .env
nano .env
```

Fill in the database credentials created in the next step. Example:
```
DB_HOST=localhost
DB_USER=event_manager
DB_PASSWORD=super_secret_password
DB_NAME=event_manager
PORT=3000
NODE_ENV=production
JWT_SECRET=your_secure_random_jwt_secret_here_change_this
```

## Step 5: Create the MySQL Database

Log into MySQL and create database/user:
```bash
sudo mysql
```
Inside the MySQL shell:
```sql
CREATE DATABASE event_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'event_manager'@'localhost' IDENTIFIED BY 'super_secret_password';
GRANT ALL PRIVILEGES ON event_manager.* TO 'event_manager'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

The backend will automatically create the necessary tables (events, users) on first connection.

## Step 6: Start the Backend with PM2

From the `backend-interserver` directory:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```
Follow the `pm2 startup` instructions so the process restarts after reboots.

Check application logs:
```bash
pm2 status
pm2 logs event-manager-interserver
```

## Step 7: Configure Nginx Reverse Proxy & Static Assets

### Copy Frontend Build
Place your built frontend into a public directory. Example:
```bash
sudo mkdir -p /var/www/event-manager-frontend
sudo cp -r ~/event-manager/dist/* /var/www/event-manager-frontend/
sudo chown -R www-data:www-data /var/www/event-manager-frontend
```

### Create Nginx Server Block
```bash
sudo nano /etc/nginx/sites-available/event-manager
```

Paste the following configuration (adjust domain names and paths):
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/event-manager-frontend;
    index index.html;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/event-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Enable HTTPS (Optional but Recommended)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```
Certbot will configure HTTPS and renew certificates automatically.

## Step 9: Frontend API Configuration

Update your frontend API base to point to the InterServer domain/IP. In `src/config/api.ts` set:
```ts
const API_BASE = "https://your-domain.com"; // no trailing slash
```

Redeploy the frontend build if necessary.

## Step 10: Maintenance & Monitoring

- **Update code**:
  ```bash
  cd ~/event-manager/backend-interserver
  git pull
  npm install
  pm2 restart event-manager-interserver
  ```
- **Database backups**:
  ```bash
  mysqldump -u event_manager -p event_manager > ~/backups/backup_$(date +%Y%m%d).sql
  ```
- **Monitor resources**:
  ```bash
  pm2 monit
  htop
  df -h
  ```

## Troubleshooting

- **Application logs**: `pm2 logs event-manager-interserver`
- **Nginx logs**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **MySQL service status**: `sudo systemctl status mysql`

## Summary

You now have the Event Management System running on InterServer with:
- Node.js + Express backend (PM2 managed)
- MySQL database
- Nginx reverse proxy serving frontend + API
- Optional HTTPS via Let’s Encrypt

For support with server-level issues, contact InterServer support (support@interserver.net or live chat).