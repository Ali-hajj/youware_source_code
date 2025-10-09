const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Password reset tokens storage (in production, use Redis or database)
const resetTokens = new Map(); // Map<token, { email, expires }>

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_USER_ID = 'shared-user';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/plain', limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let dbPool = null;
let currentDbConfig = null;

const createEventsTable = `
  CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    venue_id VARCHAR(255) NOT NULL,
    color VARCHAR(50),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_status ENUM('unpaid', 'paid', 'partial') NOT NULL DEFAULT 'unpaid',
    payment_method VARCHAR(255),
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    pricing_data JSON,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id VARCHAR(255) NOT NULL,
    owner_yw_id VARCHAR(255),
    created_by_user_id VARCHAR(255),
    created_by_display_name VARCHAR(255),
    created_by_role VARCHAR(50),
    updated_by_user_id VARCHAR(255),
    updated_by_display_name VARCHAR(255),
    updated_by_role VARCHAR(50)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'host', 'operator') NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_default_admin TINYINT(1) NOT NULL DEFAULT 0,
    owner_yw_id VARCHAR(255) NOT NULL,
    UNIQUE KEY owner_username_unique (owner_yw_id(191), username(191))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createSeedUsersTable = `
  CREATE TABLE IF NOT EXISTS seed_users (
    username VARCHAR(255) PRIMARY KEY,
    role ENUM('admin', 'manager', 'host', 'operator') NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    is_default_admin TINYINT(1) NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const createUserTokensTable = `
  CREATE TABLE IF NOT EXISTS user_tokens (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    owner_yw_id VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const initializeDatabase = async (config) => {
  if (dbPool) {
    try {
      await dbPool.end();
    } catch (error) {
      console.warn('Error closing existing database pool:', error.message);
    }
  }

  dbPool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password || '',
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    multipleStatements: true
  });

  const connection = await dbPool.getConnection();
  try {
    await connection.query('SELECT 1');
    await connection.query(createEventsTable);
    await connection.query(createUsersTable);
    await connection.query(createSeedUsersTable);
    await connection.query(createUserTokensTable);
    await connection.query(createBootstrapTokensTable);
    currentDbConfig = { ...config };
    console.log('Connected to SQL database and ensured events and users tables exist.');
  } finally {
    connection.release();
  }
};

const getEnvDatabaseConfig = () => {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (DB_HOST && DB_USER && DB_NAME) {
    return {
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD || '',
      database: DB_NAME
    };
  }
  return null;
};

const ensureDbConnection = (res) => {
  if (!dbPool) {
    res.status(503).json({
      error: 'Database not connected',
      message: 'Provide credentials via /api/database/connect before using the system.'
    });
    return false;
  }
  return true;
};

const formatDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return value;
};

const formatDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().replace('T', ' ').replace('Z', '');
  }
  return value;
};

const escapeSqlValue = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return `'${formatDateTime(value)}'`;
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
};

app.post('/api/database/connect', async (req, res) => {
  const { host, user, password, database } = req.body || {};

  if (!host || !user || !database) {
    return res.status(400).json({ error: 'host, user, and database are required fields.' });
  }

  try {
    await initializeDatabase({ host, user, password, database });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    res.status(500).json({ error: 'Failed to connect to database', details: error.message });
  }
});

app.get('/api/database/status', (req, res) => {
  if (!dbPool) {
    return res.json({ connected: false });
  }
  res.json({ connected: true, config: currentDbConfig ? { ...currentDbConfig, password: undefined } : null });
});

app.post('/api/database/import', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  const sql = typeof req.body === 'string' ? req.body : req.body?.sql;
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({ error: 'Provide SQL content to import.' });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(sql);
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to import SQL:', error);
    res.status(500).json({ error: 'Failed to import SQL', details: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/database/export', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  try {
    const [rows] = await dbPool.query('SELECT * FROM events ORDER BY date ASC, start_time ASC');
    let dump = '-- Event Manager SQL Export\n';
    dump += 'SET NAMES utf8mb4;\n\n';
    dump += createEventsTable.trim();
    if (!dump.endsWith(';')) {
      dump += ';';
    }
    dump += '\n\n';

    for (const row of rows) {
      dump += 'INSERT INTO events (' +
        'id, title, venue, venue_id, color, date, start_time, end_time, status, payment_status, payment_method, ' +
        'contact_name, contact_phone, contact_email, pricing_data, notes, created_at, updated_at, user_id' +
      ') VALUES (' +
        [
          escapeSqlValue(row.id),
          escapeSqlValue(row.title),
          escapeSqlValue(row.venue),
          escapeSqlValue(row.venue_id),
          escapeSqlValue(row.color),
          escapeSqlValue(formatDate(row.date)),
          escapeSqlValue(row.start_time),
          escapeSqlValue(row.end_time),
          escapeSqlValue(row.status),
          escapeSqlValue(row.payment_status),
          escapeSqlValue(row.payment_method),
          escapeSqlValue(row.contact_name),
          escapeSqlValue(row.contact_phone),
          escapeSqlValue(row.contact_email),
          escapeSqlValue(row.pricing_data ? JSON.parse(row.pricing_data) : null),
          escapeSqlValue(row.notes),
          escapeSqlValue(formatDateTime(row.created_at)),
          escapeSqlValue(formatDateTime(row.updated_at)),
          escapeSqlValue(row.user_id)
        ].join(', ') +
      ');\n';
    }

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="event_manager.sql"');
    res.send(dump);
  } catch (error) {
    console.error('Failed to export database:', error);
    res.status(500).json({ error: 'Failed to export database', details: error.message });
  }
});

const getUserId = () => DEFAULT_USER_ID;

const buildInsertValues = (eventData) => [
  eventData.id,
  eventData.title,
  eventData.venue,
  eventData.venueId,
  eventData.color || null,
  eventData.date,
  eventData.startTime,
  eventData.endTime,
  eventData.status,
  eventData.paymentStatus,
  eventData.paymentMethod || null,
  eventData.contact?.name || '',
  eventData.contact?.phone || '',
  eventData.contact?.email || '',
  eventData.pricing ? JSON.stringify(eventData.pricing) : null,
  eventData.notes || null,
  eventData.createdAt,
  eventData.updatedAt,
  getUserId()
];

const insertEventQuery = `
  INSERT INTO events (
    id, title, venue, venue_id, color, date, start_time, end_time,
    status, payment_status, payment_method, contact_name, contact_phone,
    contact_email, pricing_data, notes, created_at, updated_at, user_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    venue = VALUES(venue),
    venue_id = VALUES(venue_id),
    color = VALUES(color),
    date = VALUES(date),
    start_time = VALUES(start_time),
    end_time = VALUES(end_time),
    status = VALUES(status),
    payment_status = VALUES(payment_status),
    payment_method = VALUES(payment_method),
    contact_name = VALUES(contact_name),
    contact_phone = VALUES(contact_phone),
    contact_email = VALUES(contact_email),
    pricing_data = VALUES(pricing_data),
    notes = VALUES(notes),
    updated_at = VALUES(updated_at),
    user_id = VALUES(user_id)
`;

// --- Authentication Routes ---
app.post('/api/auth/signup', async (req, res) => {
  const { username, password, email, first_name, last_name } = req.body;

  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: 'Username, password, and email are required.' });
  }

  if (!ensureDbConnection(res)) return;

  try {
    // Check if user already exists
    const connection = await dbPool.getConnection();
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Username already exists.' });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique user ID
    const userId = uuidv4();

    // Insert new user
    await connection.query(
      `INSERT INTO users (id, username, email, first_name, last_name, password_hash, password_salt)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      [
        userId,
        username,
        email,
        first_name || '',
        last_name || '',
        hashedPassword,
      ]
    );

    connection.release();

    res.json({ success: true, message: 'User registered successfully!' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (!ensureDbConnection(res)) return;

  try {
    const connection = await dbPool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const storedHash = user.password_hash;
    const storedSalt = user.password_salt;

    let passwordMatch = false;

    const isSha256Hash = /^[a-f0-9]{64}$/i.test(storedHash);

    if (isSha256Hash && storedSalt) {
      const hash = crypto.createHash('sha256');
      hash.update(password + storedSalt);
      const sha256Hash = hash.digest('hex');

      if (sha256Hash === storedHash) {
        passwordMatch = true;
      }
    } else {
      passwordMatch = await bcrypt.compare(password, storedHash);
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isDefaultAdmin: Boolean(user.is_default_admin),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// --- Password Reset Endpoint ---
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!ensureDbConnection(res)) return;

  try {
    // Step 1: Request reset token
    if (email && !token && !newPassword) {
      const connection = await dbPool.getConnection();
      const [users] = await connection.query(
        'SELECT id, username FROM users WHERE email = ?',
        [email]
      );
      connection.release();

      if (users.length === 0) {
        // Don't reveal if email exists for security
        return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 3600000; // 1 hour

      resetTokens.set(resetToken, { email, expires });

      // In production, send email with reset link
      console.log(`Password reset requested for ${email}. Token: ${resetToken}`);
      console.log(`Reset link: http://your-domain.com/reset-password?token=${resetToken}`);

      return res.json({
        success: true,
        message: 'Password reset instructions sent to your email.',
        // In development, return token for testing
        ...(process.env.NODE_ENV !== 'production' && { token: resetToken })
      });
    }

    // Step 2: Reset password with token
    if (token && newPassword) {
      const tokenData = resetTokens.get(token);

      if (!tokenData || tokenData.expires < Date.now()) {
        resetTokens.delete(token);
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const connection = await dbPool.getConnection();
      await connection.query(
        'UPDATE users SET password_hash = ?, password_salt = NULL WHERE email = ?',
        [hashedPassword, tokenData.email]
      );
      connection.release();

      // Invalidate token
      resetTokens.delete(token);

      return res.json({ success: true, message: 'Password reset successfully' });
    }

    return res.status(400).json({ error: 'Invalid request parameters' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// --- User Profile Management Endpoints ---

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  if (!ensureDbConnection(res)) return;

  try {
    const connection = await dbPool.getConnection();
    const [users] = await connection.query(
      'SELECT id, username, email, first_name, last_name, role, phone, created_at, updated_at, is_default_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isDefaultAdmin: Boolean(user.is_default_admin),
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { email, first_name, last_name, phone } = req.body;

  if (!ensureDbConnection(res)) return;

  try {
    const updates = [];
    const values = [];

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.user.userId);

    const connection = await dbPool.getConnection();
    await connection.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    connection.release();

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Change password
app.put('/api/users/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (!ensureDbConnection(res)) return;

  try {
    const connection = await dbPool.getConnection();
    const [users] = await connection.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      connection.release();
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await connection.query(
      'UPDATE users SET password_hash = ?, password_salt = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.user.userId]
    );
    connection.release();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Get all users (admin only - optional)
app.get('/api/users', authenticateToken, async (req, res) => {
  if (!ensureDbConnection(res)) return;

  // Optional: Add role check for admin
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({ error: 'Admin access required' });
  // }

  try {
    const connection = await dbPool.getConnection();
    const [users] = await connection.query(
      'SELECT id, username, email, first_name, last_name, role, phone, created_at, updated_at, is_default_admin FROM users ORDER BY created_at DESC'
    );
    connection.release();

    res.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        isDefaultAdmin: Boolean(user.is_default_admin),
      }))
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Delete user account
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;

  if (!ensureDbConnection(res)) return;

  // Users can only delete their own account unless they're admin
  if (userId !== req.user.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only delete your own account' });
  }

  try {
    const connection = await dbPool.getConnection();
    const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userId]);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// API Routes
app.get('/api/events', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  try {
    const [rows] = await dbPool.query('SELECT * FROM events ORDER BY date ASC, start_time ASC');
    const events = rows.map((row) => ({
      id: row.id,
      title: row.title,
      venue: row.venue,
      venueId: row.venue_id,
      color: row.color,
      date: formatDate(row.date),
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method || undefined,
      contact: {
        name: row.contact_name,
        phone: row.contact_phone,
        email: row.contact_email
      },
      pricing: row.pricing_data ? JSON.parse(row.pricing_data) : undefined,
      notes: row.notes,
      createdAt: formatDateTime(row.created_at),
      updatedAt: formatDateTime(row.updated_at)
    }));

    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events', details: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  const eventData = req.body || {};
  try {
    await dbPool.query(insertEventQuery, buildInsertValues(eventData));
    res.json({ success: true, id: eventData.id });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event', details: error.message });
  }
});

app.post('/api/events/bulk', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  const events = Array.isArray(req.body?.events) ? req.body.events : [];
  if (!events.length) {
    return res.status(400).json({ error: 'Provide an array of events to import.' });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();
    for (const eventData of events) {
      await connection.query(insertEventQuery, buildInsertValues(eventData));
    }
    await connection.commit();
    res.json({ success: true, inserted: events.length });
  } catch (error) {
    await connection.rollback();
    console.error('Error importing events:', error);
    res.status(500).json({ error: 'Failed to import events', details: error.message });
  } finally {
    connection.release();
  }
});

app.put('/api/events/:id', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  const eventId = req.params.id;
  const eventData = req.body || {};

  try {
    const [result] = await dbPool.query(
      `UPDATE events SET
        title = ?, venue = ?, venue_id = ?, color = ?, date = ?, start_time = ?, end_time = ?,
        status = ?, payment_status = ?, payment_method = ?, contact_name = ?, contact_phone = ?,
        contact_email = ?, pricing_data = ?, notes = ?, updated_at = ?, user_id = ?
      WHERE id = ?`,
      [
        eventData.title,
        eventData.venue,
        eventData.venueId,
        eventData.color || null,
        eventData.date,
        eventData.startTime,
        eventData.endTime,
        eventData.status,
        eventData.paymentStatus,
        eventData.paymentMethod || null,
        eventData.contact?.name || '',
        eventData.contact?.phone || '',
        eventData.contact?.email || '',
        eventData.pricing ? JSON.stringify(eventData.pricing) : null,
        eventData.notes || null,
        eventData.updatedAt,
        getUserId(),
        eventId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event', details: error.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  const eventId = req.params.id;

  try {
    const [result] = await dbPool.query('DELETE FROM events WHERE id = ?', [eventId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event', details: error.message });
  }
});

app.get('/api/events/export', async (req, res) => {
  if (!ensureDbConnection(res)) return;

  try {
    const [rows] = await dbPool.query('SELECT * FROM events ORDER BY date ASC');

    const csvHeader = 'Title,Venue,Date,Start Time,End Time,Status,Payment Status,Contact Name,Contact Phone,Contact Email,Notes\n';
    const csvRows = rows.map((event) => {
      return [
        event.title,
        event.venue,
        formatDate(event.date),
        event.start_time,
        event.end_time,
        event.status,
        event.payment_status,
        event.contact_name,
        event.contact_phone,
        event.contact_email,
        event.notes || ''
      ].map((field) => `"${field ?? ''}"`).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Failed to export events:', error);
    res.status(500).json({ error: 'Failed to export events', details: error.message });
  }
});

// Serve frontend files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const start = async () => {
  const envConfig = getEnvDatabaseConfig();
  if (envConfig) {
    try {
      await initializeDatabase(envConfig);
    } catch (error) {
      console.error('Failed to initialize database from environment variables:', error.message);
    }
  } else {
    console.warn('No database environment variables provided. Use /api/database/connect to configure the connection.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();

module.exports = app;
