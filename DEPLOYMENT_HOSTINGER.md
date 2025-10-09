# Hostinger VPS Deployment Guide

This document provides step-by-step instructions for deploying your Event Management System on Hostinger.com VPS hosting.

## Overview

Since Hostinger shared hosting doesn't support Node.js applications, you'll need to use a **Hostinger VPS** to deploy your full-stack Event Management System. This guide covers the complete deployment process.

## Important Notes

- ⚠️ **Shared Hosting Limitation**: Hostinger shared hosting does NOT support Node.js backends
- ✅ **VPS Required**: You need a Hostinger VPS (KVM2 or higher) for full deployment
- 💾 **Database**: Uses MySQL instead of SQLite (D1) for traditional hosting compatibility

## What's Included

I've created a complete Hostinger-compatible backend for you in the `backend-hostinger/` folder:

- **Express.js Server**: Traditional Node.js server with Express
- **MySQL Database**: Full MySQL schema with proper indexing
- **PM2 Configuration**: Process management for production
- **Nginx Setup**: Web server configuration
- **Environment Config**: Production-ready environment variables

## Quick Start Summary

1. **Get Hostinger VPS**: Sign up for KVM2 or higher plan
2. **Access via SSH**: Connect to your VPS server
3. **Install Stack**: Node.js, MySQL, Nginx, PM2
4. **Upload Code**: Deploy the `backend-hostinger/` folder
5. **Configure Database**: Set up MySQL and import schema
6. **Deploy Frontend**: Build React app and place in public folder
7. **Configure Nginx**: Set up reverse proxy and static serving
8. **Start with PM2**: Launch application with process manager

## Database Schema

The MySQL version includes:
- **events table**: Complete event data with proper MySQL data types
- **Indexes**: Optimized for user queries and date filtering
- **JSON Support**: Pricing data stored as JSON column
- **UTF8MB4**: Full Unicode support including emojis

## Key Differences from Original

| Feature | Original (Cloudflare) | Hostinger Version |
|---------|----------------------|-------------------|
| Database | D1 (SQLite) | MySQL |
| Runtime | Cloudflare Workers | Node.js + Express |
| Authentication | Youware Headers | Basic user ID (can be extended) |
| File Storage | R2 | Local/external storage |
| Process Management | Automatic | PM2 |

## Frontend Updates Needed

Update your frontend API calls to point to your domain:
```javascript
// Change from:
const API_BASE = 'https://backend.youware.com';

// To:
const API_BASE = 'https://your-domain.com';  // or your VPS IP
```

## Complete Guide

See the detailed step-by-step guide in:
📁 **`backend-hostinger/README.md`**

## Estimated Costs

- **KVM2 VPS**: ~$3.99/month
- **Domain**: ~$8.99/year (optional)
- **SSL Certificate**: Free with Let's Encrypt

## Support Resources

- **Hostinger VPS Tutorials**: Available in their knowledge base
- **Community Forums**: Active support community
- **24/7 Support**: Live chat support for VPS customers

Your Event Management System will be fully functional on Hostinger VPS with this setup!