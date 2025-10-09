# Event Management System

A comprehensive event management application with calendar views, payment tracking, user authentication, and license management. Built with React + TypeScript frontend and Express + MySQL backend.

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

## 🛠️ Tech Stack

### Core Technologies
- React 18.3.1 + TypeScript 5.8.3
- Vite 7.0.0 (Build tool)
- Tailwind CSS 3.4.17 (CSS framework)

### Feature Libraries
- React Router DOM 6.30.1 (Routing)
- Zustand 4.4.7 (State management)
- i18next + react-i18next (Internationalization)
- Framer Motion 11.0.8 (Animations)
- Headless UI 1.7.18 (UI components)
- Lucide React (Icon library)

## 🚀 Quick Start

### Frontend Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Visit http://localhost:5173 to view the application

3. **Build for production**:
   ```bash
   npm run build
   ```

### Backend Development

1. **Navigate to backend directory**:
   ```bash
   cd backend-interserver
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start backend server**:
   ```bash
   npm start
   ```

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