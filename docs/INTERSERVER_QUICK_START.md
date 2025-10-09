# InterServer VPS Quick Start Checklist

This is a condensed checklist for deploying the Event Management System to InterServer VPS. For detailed instructions, see [INTERSERVER_INSTALLATION.md](./INTERSERVER_INSTALLATION.md).

---

## 📋 Pre-Deployment Checklist

- [ ] InterServer VPS account (Standard plan, 2GB+ RAM)
- [ ] Ubuntu 22.04 LTS selected during provisioning
- [ ] VPS IP address noted
- [ ] Root SSH credentials ready
- [ ] Domain name registered and ready
- [ ] Local machine has Node.js 18+ installed

---

## 🚀 Installation Checklist

### Phase 1: Server Setup (30 minutes)

- [ ] Connect via SSH: `ssh root@YOUR_SERVER_IP`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Create deploy user: `adduser deploy && usermod -aG sudo deploy`
- [ ] Configure firewall:
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw enable
  ```

### Phase 2: Install Stack (20 minutes)

- [ ] Install NVM:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  ```
- [ ] Install Node.js: `nvm install --lts && nvm use --lts`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install MySQL: `sudo apt install -y mysql-server`
- [ ] Secure MySQL: `sudo mysql_secure_installation`
- [ ] Install Nginx: `sudo apt install -y nginx`

### Phase 3: Database Setup (10 minutes)

- [ ] Log into MySQL: `sudo mysql`
- [ ] Create database:
  ```sql
  CREATE DATABASE event_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'event_manager'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
  GRANT ALL PRIVILEGES ON event_manager.* TO 'event_manager'@'localhost';
  FLUSH PRIVILEGES;
  EXIT;
  ```
- [ ] Save database password securely

### Phase 4: Backend Deployment (15 minutes)

- [ ] Upload code to server (Git or SFTP)
- [ ] Navigate to backend: `cd ~/event-manager/backend-interserver`
- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file: `cp .env.example .env`
- [ ] Edit `.env` with database credentials: `nano .env`
- [ ] Generate JWT secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] Update `.env` with JWT secret
- [ ] Test backend: `npm start` (Ctrl+C to stop)
- [ ] Start with PM2: `pm2 start ecosystem.config.js --env production`
- [ ] Save PM2: `pm2 save && pm2 startup`
- [ ] Verify: `pm2 status` and `curl http://localhost:3000/api/health`

### Phase 5: Frontend Deployment (20 minutes)

- [ ] **On local machine**, update `src/config/api.ts` with your domain
- [ ] Build frontend: `npm run build`
- [ ] Upload `dist/` folder to server
- [ ] On server, copy to web root:
  ```bash
  sudo mkdir -p /var/www/event-manager
  sudo cp -r ~/event-manager-frontend/* /var/www/event-manager/
  sudo chown -R www-data:www-data /var/www/event-manager
  sudo chmod -R 755 /var/www/event-manager
  ```

### Phase 6: Nginx Configuration (15 minutes)

- [ ] Create Nginx config: `sudo nano /etc/nginx/sites-available/event-manager`
- [ ] Copy configuration from installation guide
- [ ] Replace `yourdomain.com` with your actual domain
- [ ] Enable site:
  ```bash
  sudo ln -s /etc/nginx/sites-available/event-manager /etc/nginx/sites-enabled/
  sudo rm /etc/nginx/sites-enabled/default
  ```
- [ ] Test config: `sudo nginx -t`
- [ ] Reload Nginx: `sudo systemctl reload nginx`

### Phase 7: Domain & DNS (Variable time)

- [ ] Point domain A record to VPS IP
- [ ] Point www CNAME to main domain
- [ ] Wait for DNS propagation (5 min - 48 hours)
- [ ] Verify DNS: `dig yourdomain.com`

### Phase 8: SSL Certificate (10 minutes)

- [ ] Install Certbot: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] Get certificate:
  ```bash
  sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
  ```
- [ ] Choose option 2 (redirect HTTP to HTTPS)
- [ ] Test renewal: `sudo certbot renew --dry-run`

---

## ✅ Verification Checklist

### Backend Tests
- [ ] Health check: `curl https://yourdomain.com/api/health`
  - Expected: `{"status":"ok","database":"connected"}`
- [ ] Database test: `curl https://yourdomain.com/api/database/test`
  - Expected: `{"success":true,"message":"Database connection successful"}`

### Frontend Tests (Open browser: https://yourdomain.com)
- [ ] Login screen displays
- [ ] Can create new account
- [ ] Can log in with credentials
- [ ] Calendar view renders
- [ ] Can create new event
- [ ] Can edit event
- [ ] Can delete event
- [ ] Events persist after refresh
- [ ] Search functionality works
- [ ] Mobile responsive design works

### System Health
- [ ] PM2 status: `pm2 status` (should show "online")
- [ ] PM2 logs: `pm2 logs event-manager-interserver` (no errors)
- [ ] Nginx status: `sudo systemctl status nginx` (active)
- [ ] MySQL status: `sudo systemctl status mysql` (active)
- [ ] SSL certificate valid: Browser shows padlock icon

---

## 🔧 Common Commands Reference

### Backend Management
```bash
# View logs
pm2 logs event-manager-interserver

# Restart backend
pm2 restart event-manager-interserver

# Stop backend
pm2 stop event-manager-interserver

# View status
pm2 status
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Management
```bash
# Connect to database
mysql -u event_manager -p

# Backup database
mysqldump -u event_manager -p event_manager > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u event_manager -p event_manager < backup_20250101.sql
```

### System Monitoring
```bash
# CPU/Memory usage
htop

# Disk usage
df -h

# Network connections
sudo netstat -tulpn

# Process list
ps aux | grep node
```

---

## 🆘 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Backend not starting | `pm2 logs event-manager-interserver` → Check database credentials in `.env` |
| 502 Bad Gateway | Backend not running → `pm2 restart event-manager-interserver` |
| Frontend blank page | Check browser console → Update API URL in `src/config/api.ts` |
| Database connection failed | Test MySQL: `mysql -u event_manager -p` |
| SSL certificate error | Renew certificate: `sudo certbot renew` |
| CORS errors | Update `CORS_ORIGIN` in backend `.env` |

---

## 📚 Key File Locations

| Component | Location |
|-----------|----------|
| Backend code | `/home/deploy/event-manager/backend-interserver/` |
| Frontend files | `/var/www/event-manager/` |
| Nginx config | `/etc/nginx/sites-available/event-manager` |
| Backend .env | `/home/deploy/event-manager/backend-interserver/.env` |
| PM2 logs | `~/.pm2/logs/` |
| Nginx logs | `/var/log/nginx/` |
| MySQL logs | `/var/log/mysql/` |

---

## 📞 Support Contacts

- **InterServer Support**: support@interserver.net | 1-888-894-0697
- **Control Panel**: https://my.interserver.net
- **Documentation**: See [INTERSERVER_INSTALLATION.md](./INTERSERVER_INSTALLATION.md)

---

## 🎯 Post-Installation Tasks

- [ ] Set up automated daily database backups (cron job)
- [ ] Configure log rotation
- [ ] Set up monitoring/alerts (optional: UptimeRobot, Pingdom)
- [ ] Create staging environment (optional)
- [ ] Document admin credentials securely
- [ ] Test all features thoroughly
- [ ] Train users on the system

---

**Estimated Total Time**: 2-3 hours (excluding DNS propagation)

**Difficulty Level**: Intermediate

**Prerequisites Knowledge**: Basic Linux command line, SSH, text editors

---

For detailed step-by-step instructions with explanations, see [INTERSERVER_INSTALLATION.md](./INTERSERVER_INSTALLATION.md).
