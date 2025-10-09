# PHP Backend for Event Management System

This package contains the PHP/MySQL API designed for shared hosting environments (e.g., InterServer). It exposes REST endpoints compatible with the existing React frontend.

## Requirements

- PHP 8.1+
- MySQL 5.7+ or MariaDB equivalent
- Composer (optional, but recommended)
- Extensions: `pdo_mysql`, `json`, `openssl`, `mbstring`

## Installation

1. Upload this folder to your hosting account (suggested path: `/api`).
2. Run `composer install` inside the directory.
3. Copy `.env.example` to `.env` and fill DB + JWT settings.
4. Import `database/schema.sql` then `database/seed.sql` into MySQL.
5. Ensure `/public` is web-accessible (e.g., `yourdomain.com/api`).
6. Protect `.env` and `storage/` directories (already configured in `.htaccess`).

## Endpoints (prefix `/api`)

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Login (returns JWT) |
| POST | `/auth/reset-password` | Update password |
| GET | `/auth/me` | Current user profile |
| GET | `/events` | List events |
| GET | `/events/{id}` | Show single event |
| POST | `/events` | Create event |
| PUT | `/events/{id}` | Update event |
| DELETE | `/events/{id}` | Delete event |
| GET | `/licenses` | List licenses |
| POST | `/licenses` | Create license |
| POST | `/licenses/check` | Verify license key |

## Seed Credentials

- **Email:** `admin@example.com`
- **Password:** `Admin123!`

Use these to log into the frontend after deployment.
