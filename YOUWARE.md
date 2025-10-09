# Event Management System - Development Guide

This document summarizes the architecture, commands, and data structures for the event management system in this repository. Use it as a quick-start guide when maintaining or extending the project.

## Core Commands

### Frontend (Vite + React)
- Install dependencies: `npm install`
- Production build (run after any changes): `npm run build`
- Linting: not configured yet (add ESLint if needed)
- Tests: none configured

### Backend (Cloudflare Worker)
- Navigate to backend worker: `cd backend`
- Install dependencies: `npm install`
- Build worker bundle: `npm run build`
- Deploy worker (requires wrangler config): `npm run deploy` (if configured)

### Express/MySQL Backend (optional legacy API)
- Navigate to universal backend: `cd backend-interserver`
- Install dependencies: `npm install`
- Start server: `node app.js`
- Environment variables: configure `.env` with DB credentials and `JWT_SECRET`

## Architecture Overview

### Frontend (Vite + React + TypeScript)
- `src/main.tsx` bootstraps the React app and injects `App.tsx`.
- `App.tsx` renders the main layout with sidebar, calendar, history, and settings dialog.
- Component modules under `src/components/` handle feature areas:
  - `Calendar`, `DailyView`, `EventDialog` for scheduling UI
  - `HistoryTab`, `CSVImportDialog`, `ExcelImportExport`, `InvoiceDialog`, `PaymentAnalytics`
  - `SettingsDialog` hosts multi-tab settings (general, venues, colors, database, users, licenses)
  - `Sidebar` handles navigation, event creation, logout button
  - `LoginScreen` implements login/signup/reset flows with triple-click bypass text
- Zustand stores (`src/store/`) manage app state:
  - `eventStore.ts` now loads exclusively from the backend API (no local cache or auto-imports)
  - `authStore.ts` handles authentication state (login, logout, bypass mode)
  - `licenseStore.ts` manages license CRUD, verification, and result state
- API utilities (`src/config/api.ts`) centralize base URL selection and `apiCall` helper. Supports same-origin, Youware backend, or custom Hostinger endpoints.
- Utility functions live under `src/utils/` (CSV import/export, auto-import script).

### Backend Options
1. **Cloudflare Worker (`backend/`)**
   - D1 (SQLite) database schema in `schema.sql`. Includes seed inserts for 20 starter licenses (owner id `SEED_OWNER`).
   - Worker entry `src/index.ts` handles API requests for events, users, auth, and license validation CRUD (`/api/licenses`, `/api/licenses/check`).
   - Build output under `backend/output/` after running `npm run build`.
2. **Express/MySQL server (`backend-interserver/`)**
   - `app.js` sets up Express REST endpoints for events, users, authentication, and database utilities.
   - Supports external SQL hosts via `/api/database/connect` (credentials stored in Zustand).
   - Uses `mysql2/promise`, bcrypt, jsonwebtoken, UUID.

## Authentication Flow
- Frontend `LoginScreen.tsx` provides login/signup/reset modes.
- `authStore` stores JWT token, user data, and fallback bypass for offline mode.
- API endpoints in `API_ENDPOINTS` include `/api/auth/login`, `/api/auth/signup`, `/api/auth/reset-password`, `/api/auth/me`, `/api/users/...`.
- Triple-click on copyright text triggers `forceLogin()` bypass for admin access if backend unavailable.

## Database Schemas

### D1 / SQLite (`backend/schema.sql`)
```
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  color TEXT,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  pricing_data TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL
) STRICT;
```
- Additional tables may be created by worker code for users or tokens when needed.

### MySQL (`backend-interserver/app.js`)
- Auto-creates tables on startup using `mysql2` connection pool.
- `users` table: `id`, `username`, `email`, `first_name`, `last_name`, `password_hash`, `password_salt`, `role`, timestamps, indices on username/email.
- `events` table mirrors SQLite schema with VARCHAR/JSON/ENUM types.
- Auxiliary tables (`seed_users`, `user_tokens`, `bootstrap_tokens`) support initial bootstrap and password reset.

## Runtime Configuration
- `yw_manifest.json` exposes runtime options consumed via global `ywConfig` (read-only at runtime).
- Settings dialog stores database credentials in Zustand; toggles local cache if desired.
- `API_CONFIG` chooses API base URL based on environment variables (`VITE_API_ENV`, `ywConfig.apiEnv`).

## Deployment Notes
- Always run `npm run build` before delivering changes.
- Ensure asset paths use `/assets/...` form; Vite moves files accordingly.
- Cloudflare worker deployment requires configured `wrangler.toml` and environment bindings (`DB`, secrets).
- Express backend expects `.env` with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`.

## Maintenance Tips
- Keep `authStore` and `eventStore` in sync with new backend endpoints.
- When adding icons from `lucide-react`, ensure components import them explicitly (avoids runtime ReferenceError).
- Add logging around API failures in frontend to help diagnose network issues in preview environments.
