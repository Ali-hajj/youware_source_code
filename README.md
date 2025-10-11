# YouWare Event Management System

A comprehensive event management system built with React (frontend) and PHP (backend) with MySQL database.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **PHP** (v7.4 or higher) - [Download here](https://www.php.net/downloads)
- **MySQL** (v5.7 or higher) - [Download here](https://dev.mysql.com/downloads/)
- **Composer** (PHP package manager) - [Download here](https://getcomposer.org/)
- **Git** - [Download here](https://git-scm.com/)

### 📥 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd youware_source_code
   ```

## 🔧 Backend Setup (PHP)

1. **Navigate to the backend directory**
   ```bash
   cd php-backend
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env file with your database credentials
   # For local development with default MySQL setup:
   ```
   
   Edit the `.env` file:
   ```env
   APP_URL=http://localhost:8000
   APP_ENV=development
   APP_DEBUG=true
   APP_TIMEZONE=UTC
   DB_HOST=localhost
   DB_NAME=eventdb
   DB_USER=root
   DB_PASS=
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-64-chars
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Setup the database**
   ```bash
   # This will create the database, tables, and seed initial data
   php setup_db.php
   ```

5. **Start the backend server**
   ```bash
   # Navigate to the public directory
   cd public
   
   # Start PHP development server
   php -S localhost:8000
   ```

   The backend API will be available at: `http://localhost:8000`

## 🎨 Frontend Setup (React)

1. **Open a new terminal and navigate to the project root**
   ```bash
   cd youware_source_code
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Start the frontend development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at: `http://localhost:5173`

## 🔐 Default Login Credentials

After setting up the database, you can log in with:
- **Email**: `admin@example.com`
- **Password**: `Admin123!`

## ✨ Key Features

- 📅 **Calendar Management** - Monthly and daily views with drag-and-drop
- 🎫 **Event Tracking** - Create, edit, and manage events with full details
- 💰 **Payment Management** - Track payment status, methods, and generate invoices
- 🔐 **User Authentication** - Secure login/signup with JWT tokens
- 📊 **Analytics Dashboard** - Payment analytics and reporting
- 🏢 **Venue Management** - Multiple venues with custom pricing
- 🔍 **Advanced Search** - Search by name, phone, email with filters
- 📥 **Import/Export** - CSV and Excel support for bulk operations
- 🎨 **Customizable** - Theme colors, venues, and pricing configurations
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## 📁 Project Structure

```
├── src/                      # Frontend source
│   ├── components/          # React components
│   ├── store/              # Zustand state management
│   ├── config/             # API configuration
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript definitions
├── backend-interserver/     # Express + MySQL backend
│   ├── app.js              # Main server file
│   ├── ecosystem.config.js # PM2 configuration
│   └── package.json        # Backend dependencies
├── dist/                    # Production build output
├── docs/                    # Documentation
│   ├── INTERSERVER_INSTALLATION.md  # Complete setup guide
│   └── INTERSERVER_QUICK_START.md   # Quick reference
└── public/                  # Static assets
```

## 📚 Documentation

- **[Complete Installation Guide](./docs/INTERSERVER_INSTALLATION.md)** - Step-by-step InterServer VPS deployment
- **[Quick Start Checklist](./docs/INTERSERVER_QUICK_START.md)** - Fast reference for deployment
- **[Development Guide](./YOUWARE.md)** - Architecture and development workflow
- **[Deployment Options](./DEPLOYMENT.md)** - Multiple deployment strategies
- **[Hostinger Deployment](./DEPLOYMENT_HOSTINGER.md)** - Hostinger VPS specific guide

## 🌐 Deployment Options

### Option 1: InterServer VPS (Recommended for Full Stack)
- Complete backend + frontend deployment
- MySQL database
- Full control over server
- See [INTERSERVER_INSTALLATION.md](./docs/INTERSERVER_INSTALLATION.md)

### Option 2: Netlify/Vercel (Frontend Only)
- Quick deployment via drag-and-drop
- Automatic deployments from Git
- Great for demo/testing
- See [DEPLOYMENT.md](./DEPLOYMENT.md)

### Option 3: Youware Backend (Platform)
- Use Youware's managed backend
- D1 database + Cloudflare Workers
- Integrated with platform
- See backend/ folder

## 🔧 Configuration

### API Endpoints
Configure in `src/config/api.ts`:
```typescript
const API_CONFIG = {
  production: {
    baseURL: 'https://yourdomain.com',  // Your domain
  },
  // ... other environments
};
```

### Database Schema
- **events** - Event details, venues, pricing, dates
- **users** - User accounts and authentication
- **licenses** - License key management
- Auto-created on first backend connection

## 🛠️ Tech Stack

### Frontend
- React 18.3.1 + TypeScript 5.8.3
- Vite 7.0.0 (Build tool)
- Tailwind CSS 3.4.17
- Zustand 4.4.7 (State management)
- React Router DOM 6.30.1
- Lucide React (Icons)

### Backend
- Node.js 18+
- Express.js 4.21.2
- MySQL 2.x
- JWT authentication
- PM2 (Process manager)

### Infrastructure
- Ubuntu 22.04 LTS
- Nginx (Web server)
- Let's Encrypt (SSL)
- UFW (Firewall)

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection protection
- XSS protection headers
- CORS configuration
- Secure session management

## 📞 Support

For deployment issues:
- **InterServer Support**: support@interserver.net | 1-888-894-0697
- **Documentation**: See docs/ folder
- **Control Panel**: https://my.interserver.net

## 📄 License

This project includes various components and dependencies. See individual component licenses for details.