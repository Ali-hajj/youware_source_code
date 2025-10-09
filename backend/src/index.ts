export interface Env {
  DB: D1Database;
}

type UserRole = 'admin' | 'manager' | 'host' | 'operator';

type JsonPrimitive = string | number | boolean | null;

type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface JsonObject {
  [key: string]: JsonValue;
}

interface UserRecord {
  id: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  isDefaultAdmin: boolean;
  ownerYwId: string;
}

interface AuthResult {
  user: UserRecord;
  tokenHash: string;
}

interface EventRecord {
  id: string;
  title: string;
  venue: string;
  venueId: string;
  color: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  pricing?: JsonValue;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ownerYwId: string;
  createdBy: {
    userId: string;
    displayName: string | null;
    role: UserRole | null;
  };
  updatedBy?: {
    userId: string;
    displayName: string | null;
    role: UserRole | null;
  };
}

type LicenseStatus = 'active' | 'expired' | 'disabled';
type LicensePlanType = 'monthly' | 'yearly';

interface LicenseRecord {
  id: string;
  serialNumber: string;
  userName: string;
  planType: LicensePlanType;
  startDate: string;
  expiryDate: string;
  status: LicenseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ownerYwId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Project-Id, X-Encrypted-Yw-ID, X-Is-Login, X-Yw-Env',
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const USER_ID_PREFIX = 'EVN';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const encoder = new TextEncoder();

function corsResponse(response: Response): Response {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function jsonResponse(status: number, data: JsonObject): Response {
  return corsResponse(
    new Response(JSON.stringify(data), {
      status,
      headers: JSON_HEADERS,
    })
  );
}

function badRequest(message: string): Response {
  return jsonResponse(400, { error: message });
}

function unauthorized(message = 'Unauthorized'): Response {
  return jsonResponse(401, { error: message });
}

function forbidden(message = 'Forbidden'): Response {
  return jsonResponse(403, { error: message });
}

function notFound(message = 'Not Found'): Response {
  return jsonResponse(404, { error: message });
}

function internalError(error: unknown): Response {
  console.error('Backend error:', error);
  return jsonResponse(500, {
    error: 'Internal Server Error',
    details: error instanceof Error ? error.message : 'Unknown error',
  });
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function hashString(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toHex(new Uint8Array(buffer));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return hashString(`${salt}:${password}`);
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function normalizeDisplayName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(' ').trim();
}

async function cleanupExpiredTokens(env: Env): Promise<void> {
  const now = Date.now();
  await env.DB.prepare('DELETE FROM user_tokens WHERE expires_at < ?').bind(now).run();
}

async function fetchUserByUsername(env: Env, projectId: string, username: string) {
  return env.DB.prepare(
    `SELECT * FROM users WHERE owner_yw_id = ? AND LOWER(username) = LOWER(?) LIMIT 1`
  )
    .bind(projectId, username)
    .first<any>();
}

function mapDbUser(row: any): UserRecord {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDefaultAdmin: Boolean(row.is_default_admin),
    ownerYwId: row.owner_yw_id,
  };
}

function serializeUser(user: UserRecord): JsonObject {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isDefaultAdmin: user.isDefaultAdmin,
  };
}

async function getNextUserId(env: Env, projectId: string): Promise<string> {
  const row = await env.DB.prepare(
    `SELECT id FROM users WHERE owner_yw_id = ? ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC LIMIT 1`
  )
    .bind(projectId)
    .first<{ id: string }>();

  if (!row) {
    return `${USER_ID_PREFIX}001`;
  }

  const numeric = parseInt(row.id.slice(USER_ID_PREFIX.length), 10);
  const nextValue = numeric + 1;
  return `${USER_ID_PREFIX}${nextValue.toString().padStart(3, '0')}`;
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token || null;
}

async function authenticate(
  request: Request,
  env: Env,
  projectId: string
): Promise<AuthResult | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  const tokenHash = await hashString(token);

  const row = await env.DB.prepare(
    `SELECT user_id, expires_at FROM user_tokens WHERE token_hash = ? AND owner_yw_id = ? LIMIT 1`
  )
    .bind(tokenHash, projectId)
    .first<{ user_id: string; expires_at: number }>();

  if (!row) {
    return null;
  }

  if (row.expires_at <= Date.now()) {
    await env.DB.prepare('DELETE FROM user_tokens WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  const userRow = await env.DB.prepare(
    `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
  )
    .bind(row.user_id, projectId)
    .first<any>();

  if (!userRow) {
    await env.DB.prepare('DELETE FROM user_tokens WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  return {
    user: mapDbUser(userRow),
    tokenHash,
  };
}

function mapEventRow(row: any): EventRecord {
  const createdBy = {
    userId: row.created_by_user_id,
    displayName: row.created_by_display_name,
    role: row.created_by_role,
  };

  const updatedBy = row.updated_by_user_id
    ? {
        userId: row.updated_by_user_id,
        displayName: row.updated_by_display_name,
        role: row.updated_by_role,
      }
    : undefined;

  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    venueId: row.venue_id,
    color: row.color,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    contact: {
      name: row.contact_name,
      phone: row.contact_phone,
      email: row.contact_email,
    },
    pricing: row.pricing_data ? JSON.parse(row.pricing_data) : undefined,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerYwId: row.owner_yw_id,
    createdBy,
    updatedBy,
  };
}

function mapLicenseRow(row: any): LicenseRecord {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    userName: row.user_name,
    planType: row.plan_type,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerYwId: row.owner_yw_id,
  };
}

const LICENSE_PLAN_VALUES: LicensePlanType[] = ['monthly', 'yearly'];
const LICENSE_STATUS_VALUES: LicenseStatus[] = ['active', 'expired', 'disabled'];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isLicensePlanType(value: string): value is LicensePlanType {
  return LICENSE_PLAN_VALUES.includes(value as LicensePlanType);
}

function isLicenseStatus(value: string): value is LicenseStatus {
  return LICENSE_STATUS_VALUES.includes(value as LicenseStatus);
}

function parseIsoDateStrict(value: string): Date | null {
  if (!ISO_DATE_REGEX.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const maxDay = new Date(result.getUTCFullYear(), result.getUTCMonth() + 1, 0).getUTCDate();
  result.setUTCDate(Math.min(day, maxDay));
  return result;
}

function sanitizeSerialSegment(input: string | undefined, fallback: string): string {
  if (!input) {
    return fallback;
  }
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned || fallback;
}

function randomAlphaNumeric(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

async function licenseSerialExists(env: Env, ownerYwId: string, serialNumber: string): Promise<boolean> {
  const existing = await env.DB.prepare(
    `SELECT id FROM licenses WHERE owner_yw_id = ? AND serial_number = ? LIMIT 1`
  )
    .bind(projectId, serialNumber)
    .first<any>();
  return Boolean(existing);
}

interface LicenseSerialOptions {
  prefix?: string;
  userName?: string;
  planType: LicensePlanType;
  issuedAt: Date;
  randomLength?: number;
  ownerYwId: string;
}

async function generateUniqueLicenseSerial(env: Env, options: LicenseSerialOptions): Promise<string> {
  const base = sanitizeSerialSegment(options.prefix ?? options.userName, 'CLIENT').slice(0, 12);
  const planSegment = options.planType === 'yearly' ? 'YR' : 'MN';
  const dateSegment = formatIsoDate(options.issuedAt).replace(/-/g, '');
  const randomLength = options.randomLength && options.randomLength >= 2 && options.randomLength <= 8
    ? Math.floor(options.randomLength)
    : 4;

  for (let attempt = 0; attempt < 12; attempt++) {
    const serialNumber = `${base}-${planSegment}-${dateSegment}-${randomAlphaNumeric(randomLength)}`;
    if (!(await licenseSerialExists(env, options.ownerYwId, serialNumber))) {
      return serialNumber;
    }
  }

  throw new Error('Failed to generate a unique license serial number');
}

class LicenseInsertError extends Error {
  constructor(message: string, public code: 'DUPLICATE_SERIAL' | 'INVALID_DATE' = 'INVALID_DATE') {
    super(message);
    this.name = 'LicenseInsertError';
  }
}

function ensureLicenseDateRange(startDate: string, expiryDate: string): void {
  const start = parseIsoDateStrict(startDate);
  if (!start) {
    throw new LicenseInsertError('Invalid start date format', 'INVALID_DATE');
  }
  const expiry = parseIsoDateStrict(expiryDate);
  if (!expiry) {
    throw new LicenseInsertError('Invalid expiry date format', 'INVALID_DATE');
  }
  if (expiry.getTime() < start.getTime()) {
    throw new LicenseInsertError('Expiry date must be after start date', 'INVALID_DATE');
  }
}

interface LicenseInsertInput {
  serialNumber: string;
  userName: string;
  planType: LicensePlanType;
  startDate: string;
  expiryDate: string;
  status: LicenseStatus;
  notes: string | null;
}

async function insertLicenseRecord(env: Env, ownerYwId: string, input: LicenseInsertInput): Promise<LicenseRecord> {
  ensureLicenseDateRange(input.startDate, input.expiryDate);

  const existingSerial = await env.DB.prepare(
    `SELECT id FROM licenses WHERE owner_yw_id = ? AND serial_number = ? LIMIT 1`
  )
    .bind(ownerYwId, input.serialNumber)
    .first<any>();

  if (existingSerial) {
    throw new LicenseInsertError('Serial number already exists', 'DUPLICATE_SERIAL');
  }

  const licenseId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO licenses (
        id, serial_number, user_name, plan_type, start_date, expiry_date, status, notes,
        created_at, updated_at, owner_yw_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        licenseId,
        input.serialNumber,
        input.userName,
        input.planType,
        input.startDate,
        input.expiryDate,
        input.status,
        input.notes,
        nowIso,
        nowIso,
        ownerYwId
      )
      .run();
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
      throw new LicenseInsertError('Serial number already exists', 'DUPLICATE_SERIAL');
    }
    throw error;
  }

  const saved = await env.DB.prepare(
    `SELECT * FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
  )
    .bind(licenseId, ownerYwId)
    .first<any>();

  if (!saved) {
    throw new Error('Failed to load created license');
  }

  return mapLicenseRow(saved);
}

async function fetchEventById(env: Env, projectId: string, eventId: string) {
  const row = await env.DB.prepare(
    `SELECT * FROM events WHERE id = ? AND owner_yw_id = ? LIMIT 1`
  )
    .bind(eventId, projectId)
    .first<any>();

  return row ? mapEventRow(row) : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === 'OPTIONS') {
        return corsResponse(new Response(null, { status: 204 }));
      }

      const url = new URL(request.url);
      const path = url.pathname;
      
      // Use X-Project-Id for shared project support
      const projectId = request.headers.get('X-Project-Id');
      const userYwId = request.headers.get('X-Encrypted-Yw-ID');

      if (!projectId || !userYwId) {
        return unauthorized('Missing project context headers');
      }

      await cleanupExpiredTokens(env);

      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json().catch(() => null);

        if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
          return badRequest('Username and password are required');
        }

        const dbUser = await fetchUserByUsername(env, projectId, body.username);
        if (!dbUser) {
          return unauthorized('Invalid credentials');
        }

        const expectedHash = await hashPassword(body.password, dbUser.password_salt);
        if (expectedHash !== dbUser.password_hash) {
          return unauthorized('Invalid credentials');
        }

        const user = mapDbUser(dbUser);
        const token = generateToken();
        const tokenHash = await hashString(token);
        const expiresAt = Date.now() + TOKEN_TTL_MS;

        await env.DB.prepare('DELETE FROM user_tokens WHERE user_id = ? AND owner_yw_id = ?')
          .bind(user.id, projectId)
          .run();

        await env.DB.prepare(
          `INSERT INTO user_tokens (token_hash, user_id, expires_at, owner_yw_id) VALUES (?, ?, ?, ?)`
        )
          .bind(tokenHash, user.id, expiresAt, projectId)
          .run();

        return jsonResponse(200, {
          token,
          expiresAt,
          user: serializeUser(user),
        });
      }

      if (path === '/api/auth/logout' && request.method === 'POST') {
        const auth = await authenticate(request, env, projectId);
        if (!auth) {
          return unauthorized();
        }

        await env.DB.prepare('DELETE FROM user_tokens WHERE token_hash = ?')
          .bind(auth.tokenHash)
          .run();

        return jsonResponse(200, { success: true });
      }

      if (path === '/api/auth/me' && request.method === 'GET') {
        const auth = await authenticate(request, env, projectId);
        if (!auth) {
          return unauthorized();
        }

        return jsonResponse(200, { user: serializeUser(auth.user) });
      }

      // All endpoints below require authenticated user
      const auth = await authenticate(request, env, projectId);
      if (!auth) {
        return unauthorized();
      }

      const currentUser = auth.user;

      if (path === '/api/users' && request.method === 'GET') {
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
          return forbidden();
        }

        const { results } = await env.DB.prepare(
          `SELECT * FROM users WHERE owner_yw_id = ? ORDER BY created_at ASC`
        )
          .bind(projectId)
          .all();

        const users = results.map(mapDbUser).map(serializeUser);
        return jsonResponse(200, { users });
      }

      if (path === '/api/users' && request.method === 'POST') {
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
          return forbidden();
        }

        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest('Invalid payload');
        }

        const {
          username,
          password,
          role,
          firstName,
          lastName,
          phone,
          email,
        } = body;

        if (
          typeof username !== 'string' ||
          typeof password !== 'string' ||
          typeof role !== 'string' ||
          typeof firstName !== 'string' ||
          typeof lastName !== 'string' ||
          typeof phone !== 'string' ||
          typeof email !== 'string'
        ) {
          return badRequest('Missing required user fields');
        }

        const normalizedRole = role.toLowerCase() as UserRole;
        if (!['admin', 'manager', 'host', 'operator'].includes(normalizedRole)) {
          return badRequest('Invalid role');
        }

        if (currentUser.role === 'manager' && (normalizedRole === 'admin' || normalizedRole === 'manager')) {
          return forbidden('Managers can only create host or operator accounts');
        }

        const existingUser = await fetchUserByUsername(env, projectId, username);
        if (existingUser) {
          return badRequest('Username already exists');
        }

        const userId = await getNextUserId(env, projectId);

        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const nowIso = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO users (
            id, username, role, first_name, last_name, phone, email,
            password_hash, password_salt, created_at, updated_at, is_default_admin, owner_yw_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        )
          .bind(
            userId,
            username,
            normalizedRole,
            firstName,
            lastName,
            phone,
            email,
            passwordHash,
            salt,
            nowIso,
            nowIso,
            projectId
          )
          .run();

        const newUser = await env.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(userId, projectId)
          .first<any>();

        return jsonResponse(201, { user: serializeUser(mapDbUser(newUser)) });
      }

      if (path.startsWith('/api/users/') && request.method === 'PUT') {
        const userId = path.split('/')[3];
        if (!userId) {
          return badRequest('User ID is required');
        }

        const targetRow = await env.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(userId, projectId)
          .first<any>();

        if (!targetRow) {
          return notFound('User not found');
        }

        const targetUser = mapDbUser(targetRow);

        if (currentUser.role === 'manager') {
          if (targetUser.role === 'admin' || targetUser.role === 'manager') {
            return forbidden('Managers can only modify host or operator accounts');
          }
        }

        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest('Invalid payload');
        }

        const {
          firstName = targetUser.firstName,
          lastName = targetUser.lastName,
          phone = targetUser.phone,
          email = targetUser.email,
          role = targetUser.role,
          password,
        } = body;

        const normalizedRole = (role as string | undefined)?.toLowerCase() as UserRole | undefined;
        if (
          normalizedRole &&
          !['admin', 'manager', 'host', 'operator'].includes(normalizedRole)
        ) {
          return badRequest('Invalid role');
        }

        if (targetUser.isDefaultAdmin && normalizedRole && normalizedRole !== 'admin') {
          return forbidden('Default admin must remain an admin');
        }

        if (currentUser.role === 'manager' && normalizedRole && (normalizedRole === 'admin' || normalizedRole === 'manager')) {
          return forbidden('Managers cannot promote users to admin or manager');
        }

        const nowIso = new Date().toISOString();
        let passwordHash = targetRow.password_hash;
        let salt = targetRow.password_salt;

        if (typeof password === 'string' && password.length > 0) {
          salt = generateSalt();
          passwordHash = await hashPassword(password, salt);
        }

        await env.DB.prepare(
          `UPDATE users SET 
            first_name = ?,
            last_name = ?,
            phone = ?,
            email = ?,
            role = ?,
            password_hash = ?,
            password_salt = ?,
            updated_at = ?
          WHERE id = ? AND owner_yw_id = ?`
        )
          .bind(
            firstName,
            lastName,
            phone,
            email,
            normalizedRole ?? targetUser.role,
            passwordHash,
            salt,
            nowIso,
            targetUser.id,
            projectId
          )
          .run();

        const updatedRow = await env.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(targetUser.id, projectId)
          .first<any>();

        return jsonResponse(200, { user: serializeUser(mapDbUser(updatedRow)) });
      }

      if (path.startsWith('/api/users/') && request.method === 'DELETE') {
        const userId = path.split('/')[3];
        if (!userId) {
          return badRequest('User ID is required');
        }

        const targetRow = await env.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(userId, projectId)
          .first<any>();

        if (!targetRow) {
          return notFound('User not found');
        }

        const targetUser = mapDbUser(targetRow);

        if (targetUser.isDefaultAdmin) {
          return forbidden('Cannot delete the default admin account');
        }

        if (currentUser.role === 'manager') {
          if (targetUser.role === 'admin' || targetUser.role === 'manager') {
            return forbidden('Managers can only delete host or operator accounts');
          }
        }

        await env.DB.prepare('DELETE FROM user_tokens WHERE user_id = ? AND owner_yw_id = ?')
          .bind(targetUser.id, projectId)
          .run();

        await env.DB.prepare('DELETE FROM users WHERE id = ? AND owner_yw_id = ?')
          .bind(targetUser.id, projectId)
          .run();

        return jsonResponse(200, { success: true });
      }

      if (path === '/api/events' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM events
           WHERE owner_yw_id = ?
              OR owner_yw_id IS NULL
           ORDER BY date ASC, start_time ASC`
        )
          .bind(projectId)
          .all();

        const events = results
          .filter((row) => row.owner_yw_id === projectId || row.owner_yw_id === null)
          .map((row) => {
            if (!row.owner_yw_id) {
              row.owner_yw_id = projectId;
            }
            return mapEventRow(row);
          });

        const legacyIds = events
          .filter((event) => !event.ownerYwId)
          .map((event) => event.id);

        if (legacyIds.length > 0) {
          const placeholders = legacyIds.map(() => '?').join(',');
          await env.DB.prepare(
            `UPDATE events SET owner_yw_id = ? WHERE id IN (${placeholders})`
          )
            .bind(projectId, ...legacyIds)
            .run();

          events.forEach((event) => {
            if (!event.ownerYwId) {
              event.ownerYwId = projectId;
            }
          });
        }

        return jsonResponse(200, { events });
      }

      if (path === '/api/events' && request.method === 'DELETE') {
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
          return forbidden('Only admin or manager can clear events');
        }

        await env.DB.prepare('DELETE FROM events WHERE owner_yw_id = ?')
          .bind(projectId)
          .run();

        return jsonResponse(200, { success: true });
      }

      if (path === '/api/events' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest('Invalid payload');
        }

        const eventId = typeof body.id === 'string' ? body.id : crypto.randomUUID();
        const createdAt = typeof body.createdAt === 'string' ? body.createdAt : new Date().toISOString();
        const updatedAt = typeof body.updatedAt === 'string' ? body.updatedAt : createdAt;

        const displayName = normalizeDisplayName(currentUser.firstName, currentUser.lastName);
        const pricingData = body.pricing ? JSON.stringify(body.pricing) : null;

        await env.DB.prepare(
          `INSERT INTO events (
            id, title, venue, venue_id, color, date, start_time, end_time,
            status, payment_status, payment_method, contact_name, contact_phone,
            contact_email, pricing_data, notes, created_at, updated_at, user_id,
            owner_yw_id,
            created_by_user_id, created_by_display_name, created_by_role,
            updated_by_user_id, updated_by_display_name, updated_by_role
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            eventId,
            body.title,
            body.venue,
            body.venueId ?? body.venue,
            body.color ?? null,
            body.date,
            body.startTime,
            body.endTime,
            body.status,
            body.paymentStatus,
            body.paymentMethod ?? null,
            body.contact?.name,
            body.contact?.phone,
            body.contact?.email,
            pricingData,
            body.notes ?? null,
            createdAt,
            updatedAt,
            currentUser.id,
            projectId,
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role,
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role
          )
          .run();

        const savedEvent = await fetchEventById(env, projectId, eventId);
        return jsonResponse(201, { event: savedEvent });
      }

      if (path === '/api/events/bulk' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !Array.isArray(body.events)) {
          return badRequest('Invalid payload');
        }

        const displayName = normalizeDisplayName(currentUser.firstName, currentUser.lastName);
        const nowIso = new Date().toISOString();

        const inserts = body.events.map((incoming: any) => {
          const eventId = typeof incoming.id === 'string' ? incoming.id : crypto.randomUUID();
          const createdAt = typeof incoming.createdAt === 'string' ? incoming.createdAt : nowIso;
          const updatedAt = typeof incoming.updatedAt === 'string' ? incoming.updatedAt : createdAt;
          const pricingData = incoming.pricing ? JSON.stringify(incoming.pricing) : null;

          return env.DB.prepare(
            `INSERT INTO events (
              id, title, venue, venue_id, color, date, start_time, end_time,
              status, payment_status, payment_method, contact_name, contact_phone,
              contact_email, pricing_data, notes, created_at, updated_at,
              owner_yw_id,
              created_by_user_id, created_by_display_name, created_by_role,
              updated_by_user_id, updated_by_display_name, updated_by_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            eventId,
            incoming.title,
            incoming.venue,
            incoming.venueId ?? incoming.venue,
            incoming.color ?? null,
            incoming.date,
            incoming.startTime,
            incoming.endTime,
            incoming.status,
            incoming.paymentStatus,
            incoming.paymentMethod ?? null,
            incoming.contact?.name,
            incoming.contact?.phone,
            incoming.contact?.email,
            pricingData,
            incoming.notes ?? null,
            createdAt,
            updatedAt,
            projectId,
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role,
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role
          );
        });

        await env.DB.batch(inserts);

        const { results } = await env.DB.prepare(
          `SELECT * FROM events WHERE owner_yw_id = ? ORDER BY date ASC, start_time ASC`
        )
          .bind(projectId)
          .all();

        const events = results.map(mapEventRow);
        return jsonResponse(201, { events });
      }

      if (path.startsWith('/api/events/') && request.method === 'PUT') {
        const eventId = path.split('/')[3];
        if (!eventId) {
          return badRequest('Event ID is required');
        }

        const existing = await fetchEventById(env, projectId, eventId);
        if (!existing) {
          return notFound('Event not found');
        }

        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest('Invalid payload');
        }

        const pricingData = body.pricing ? JSON.stringify(body.pricing) : null;
        const displayName = normalizeDisplayName(currentUser.firstName, currentUser.lastName);

        await env.DB.prepare(
          `UPDATE events SET
            title = ?,
            venue = ?,
            venue_id = ?,
            color = ?,
            date = ?,
            start_time = ?,
            end_time = ?,
            status = ?,
            payment_status = ?,
            payment_method = ?,
            contact_name = ?,
            contact_phone = ?,
            contact_email = ?,
            pricing_data = ?,
            notes = ?,
            updated_at = ?,
            updated_by_user_id = ?,
            updated_by_display_name = ?,
            updated_by_role = ?
          WHERE id = ? AND owner_yw_id = ?`
        )
          .bind(
            body.title ?? existing.title,
            body.venue ?? existing.venue,
            body.venueId ?? existing.venueId,
            body.color ?? existing.color,
            body.date ?? existing.date,
            body.startTime ?? existing.startTime,
            body.endTime ?? existing.endTime,
            body.status ?? existing.status,
            body.paymentStatus ?? existing.paymentStatus,
            body.paymentMethod ?? existing.paymentMethod,
            body.contact?.name ?? existing.contact.name,
            body.contact?.phone ?? existing.contact.phone,
            body.contact?.email ?? existing.contact.email,
            pricingData,
            body.notes ?? existing.notes,
            new Date().toISOString(),
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role,
            eventId,
            userYwId
          )
          .run();

        const updatedEvent = await fetchEventById(env, projectId, eventId);
        return jsonResponse(200, { event: updatedEvent });
      }

      if (path.startsWith('/api/events/') && request.method === 'DELETE') {
        const eventId = path.split('/')[3];
        if (!eventId) {
          return badRequest('Event ID is required');
        }

        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
          return forbidden('Only admin or manager can delete events');
        }

        const existing = await fetchEventById(env, projectId, eventId);
        if (!existing) {
          return notFound('Event not found');
        }

        await env.DB.prepare('DELETE FROM events WHERE id = ? AND owner_yw_id = ?')
          .bind(eventId, projectId)
          .run();

        return jsonResponse(200, { success: true });
      }

      if (path === '/api/licenses' && request.method === 'GET') {
        if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
          return forbidden('Only admin or manager can list licenses');
        }

        const { results } = await env.DB.prepare(
          `SELECT * FROM licenses WHERE owner_yw_id = ? ORDER BY created_at DESC`
        )
          .bind(userYwId)
          .all();

        const licenses = results.map(mapLicenseRow);
        return jsonResponse(200, { licenses });
      }

      if (path === '/api/licenses/generate' && request.method === 'POST') {
        if (currentUser.role !== 'admin') {
          return forbidden('Only admins can generate licenses');
        }

        const body = await request.json().catch(() => null);
        if (!body || typeof body.planType !== 'string') {
          return badRequest('planType is required');
        }

        const normalizedPlan = body.planType.toLowerCase();
        if (!isLicensePlanType(normalizedPlan)) {
          return badRequest('Invalid plan type');
        }

        const issuedAt = new Date();
        const startDate = typeof body.startDate === 'string' ? body.startDate : formatIsoDate(issuedAt);
        const start = parseIsoDateStrict(startDate);
        if (!start) {
          return badRequest('startDate must be in YYYY-MM-DD format');
        }

        const expiryDateInput = typeof body.expiryDate === 'string' ? body.expiryDate : null;
        let expiryDate: string;
        if (expiryDateInput) {
          const parsedExpiry = parseIsoDateStrict(expiryDateInput);
          if (!parsedExpiry) {
            return badRequest('expiryDate must be in YYYY-MM-DD format');
          }
          expiryDate = formatIsoDate(parsedExpiry);
        } else {
          const monthsToAdd = normalizedPlan === 'yearly' ? 12 : 1;
          expiryDate = formatIsoDate(addMonthsUtc(start, monthsToAdd));
        }

        const serialNumber = await generateUniqueLicenseSerial(env, {
          ownerYwId,
          planType: normalizedPlan,
          issuedAt,
          prefix: typeof body.prefix === 'string' ? body.prefix : undefined,
          userName: typeof body.userName === 'string' ? body.userName : undefined,
          randomLength: typeof body.randomLength === 'number' ? body.randomLength : undefined,
        });

        const license = await insertLicenseRecord(env, ownerYwId, {
          serialNumber,
          userName: typeof body.userName === 'string' ? body.userName : 'Unassigned',
          planType: normalizedPlan,
          startDate: formatIsoDate(start),
          expiryDate,
          status: 'active',
          notes: typeof body.notes === 'string' ? body.notes : null,
        });

        return jsonResponse(201, { license });
      }

      if (path === '/api/licenses/generate' && request.method === 'GET') {
        if (currentUser.role !== 'admin') {
          return forbidden('Only admins can generate licenses');
        }

        const planType = url.searchParams.get('planType') ?? 'monthly';
        if (!isLicensePlanType(planType)) {
          return badRequest('Invalid plan type');
        }

        const issuedAt = new Date();
        const serialNumber = await generateUniqueLicenseSerial(env, {
          ownerYwId,
          planType,
          issuedAt,
          prefix: url.searchParams.get('prefix') ?? undefined,
          userName: url.searchParams.get('userName') ?? undefined,
          randomLength: url.searchParams.get('randomLength')
            ? Number.parseInt(url.searchParams.get('randomLength') || '', 10)
            : undefined,
        });

        const startDate = formatIsoDate(issuedAt);
        const expiryDate = formatIsoDate(addMonthsUtc(issuedAt, planType === 'yearly' ? 12 : 1));

        return jsonResponse(200, {
          serialNumber,
          planType,
          startDate,
          expiryDate,
          preview: true,
        });
      }

      if (path === '/api/licenses' && request.method === 'POST') {
        if (currentUser.role !== 'admin') {
          return forbidden('Only admins can create licenses');
        }

        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest('Invalid payload');
        }

        const {
          serialNumber,
          userName,
          planType,
          startDate,
          expiryDate,
          status = 'active',
          notes = null,
          autoGenerate,
        } = body;

        if (autoGenerate) {
          if (typeof planType !== 'string') {
            return badRequest('planType is required when autoGenerate=true');
          }

          const normalizedPlan = planType.toLowerCase();
          if (!isLicensePlanType(normalizedPlan)) {
            return badRequest('Invalid plan type');
          }

          const issuedAt = new Date();
          const generatedSerial = await generateUniqueLicenseSerial(env, {
            userYwId,
            planType: normalizedPlan,
            issuedAt,
            prefix: typeof body.prefix === 'string' ? body.prefix : undefined,
            userName: typeof userName === 'string' ? userName : undefined,
            randomLength: typeof body.randomLength === 'number' ? body.randomLength : undefined,
          });

          const effectiveStart = typeof startDate === 'string' ? startDate : formatIsoDate(issuedAt);
          const start = parseIsoDateStrict(effectiveStart);
          if (!start) {
            return badRequest('startDate must be in YYYY-MM-DD format');
          }

          const effectiveExpiry = typeof expiryDate === 'string'
            ? expiryDate
            : formatIsoDate(addMonthsUtc(start, normalizedPlan === 'yearly' ? 12 : 1));

          try {
            const license = await insertLicenseRecord(env, ownerYwId, {
              serialNumber: generatedSerial,
              userName: typeof userName === 'string' ? userName : 'Unassigned',
              planType: normalizedPlan,
              startDate: formatIsoDate(start),
              expiryDate: effectiveExpiry,
              status: isLicenseStatus(typeof status === 'string' ? status.toLowerCase() : '')
                ? (status as LicenseStatus)
                : 'active',
              notes: typeof notes === 'string' ? notes : null,
            });

            return jsonResponse(201, { license, generated: true });
          } catch (error) {
            if (error instanceof LicenseInsertError) {
              return badRequest(error.message);
            }
            throw error;
          }
        }

        if (
          typeof serialNumber !== 'string' ||
          typeof userName !== 'string' ||
          typeof planType !== 'string' ||
          typeof startDate !== 'string' ||
          typeof expiryDate !== 'string'
        ) {
          return badRequest('Missing required license fields');
        }

        const normalizedPlan = planType.toLowerCase();
        if (!isLicensePlanType(normalizedPlan)) {
          return badRequest('Invalid plan type');
        }

        const normalizedStatus = (typeof status === 'string' ? status.toLowerCase() : 'active');
        if (!isLicenseStatus(normalizedStatus)) {
          return badRequest('Invalid license status');
        }

        try {
          const license = await insertLicenseRecord(env, ownerYwId, {
            serialNumber,
            userName,
            planType: normalizedPlan,
            startDate,
            expiryDate,
            status: normalizedStatus,
            notes: typeof notes === 'string' ? notes : null,
          });
          return jsonResponse(201, { license });
        } catch (error) {
          if (error instanceof LicenseInsertError) {
            return badRequest(error.message);
          }
          throw error;
        }
      }

      if (path === '/api/licenses/preview-serial' && request.method === 'GET') {
        if (currentUser.role !== 'admin') {
          return forbidden('Only admins can preview serials');
        }

        const planType = (url.searchParams.get('planType') ?? 'monthly').toLowerCase();
        if (!isLicensePlanType(planType)) {
          return badRequest('Invalid plan type');
        }

        const issuedAtParam = url.searchParams.get('issuedAt');
        const issuedAt = issuedAtParam ? new Date(issuedAtParam) : new Date();
        if (Number.isNaN(issuedAt.getTime())) {
          return badRequest('issuedAt must be a valid date');
        }

        const serialNumber = await generateUniqueLicenseSerial(env, {
          ownerYwId,
          planType,
          issuedAt,
          prefix: url.searchParams.get('prefix') ?? undefined,
          userName: url.searchParams.get('userName') ?? undefined,
          randomLength: url.searchParams.get('randomLength')
            ? Number.parseInt(url.searchParams.get('randomLength') || '', 10)
            : undefined,
        });

        const startDate = url.searchParams.get('startDate') || formatIsoDate(issuedAt);

        let expiryDate: string;
        const expiryParam = url.searchParams.get('expiryDate');
        if (expiryParam) {
          const parsedExpiry = parseIsoDateStrict(expiryParam);
          if (!parsedExpiry) {
            return badRequest('expiryDate must be in YYYY-MM-DD format');
          }
          expiryDate = formatIsoDate(parsedExpiry);
        } else {
          const parsedStart = parseIsoDateStrict(startDate);
          if (!parsedStart) {
            return badRequest('startDate must be in YYYY-MM-DD format');
          }
          expiryDate = formatIsoDate(addMonthsUtc(parsedStart, planType === 'yearly' ? 12 : 1));
        }

        return jsonResponse(200, {
          serialNumber,
          planType,
          startDate,
          expiryDate,
          preview: true,
        });
      }

      if (path.startsWith('/api/licenses/') && request.method === 'PUT') {
        if (currentUser.role !== 'admin') {
          return forbidden('Only admins can modify licenses');
        }

        const licenseId = path.split('/')[3];
        if (!licenseId) {
          return badRequest('License ID is required');
        }

        const existingRow = await env.DB.prepare(
          `SELECT * FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(licenseId, projectId)
          .first<any>();

        if (!existingRow) {
          return notFound('License not found');
        }

        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest('Invalid payload');
        }

        const {
          serialNumber = existingRow.serial_number,
          userName = existingRow.user_name,
          planType = existingRow.plan_type,
          startDate = existingRow.start_date,
          expiryDate = existingRow.expiry_date,
          status = existingRow.status,
          notes = existingRow.notes,
        } = body;

        const normalizedPlan = (planType as string | undefined)?.toLowerCase() as LicensePlanType | undefined;
        if (normalizedPlan && !['monthly', 'yearly'].includes(normalizedPlan)) {
          return badRequest('Invalid plan type');
        }

        const normalizedStatus = (status as string | undefined)?.toLowerCase() as LicenseStatus | undefined;
        if (normalizedStatus && !['active', 'expired', 'disabled'].includes(normalizedStatus)) {
          return badRequest('Invalid license status');
        }

        if (serialNumber !== existingRow.serial_number) {
          const duplicate = await env.DB.prepare(
            `SELECT id FROM licenses WHERE owner_yw_id = ? AND serial_number = ? AND id != ? LIMIT 1`
          )
            .bind(ownerYwId, serialNumber, licenseId)
            .first<{ id: string }>();

          if (duplicate) {
            return badRequest('Serial number already exists');
          }
        }

        const updateIso = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE licenses SET
            serial_number = ?,
            user_name = ?,
            plan_type = ?,
            start_date = ?,
            expiry_date = ?,
            status = ?,
            notes = ?,
            updated_at = ?
          WHERE id = ? AND owner_yw_id = ?`
        )
          .bind(
            serialNumber,
            userName,
            normalizedPlan ?? existingRow.plan_type,
            startDate,
            expiryDate,
            normalizedStatus ?? existingRow.status,
            notes,
            updateIso,
            licenseId,
            userYwId
          )
          .run();

        const updated = await env.DB.prepare(
          `SELECT * FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(licenseId, projectId)
          .first<any>();

        return jsonResponse(200, { license: mapLicenseRow(updated) });
      }

      if (path.startsWith('/api/licenses/') && request.method === 'DELETE') {
        if (currentUser.role !== 'admin') {
          return forbidden('Only admins can delete licenses');
        }

        const licenseId = path.split('/')[3];
        if (!licenseId) {
          return badRequest('License ID is required');
        }

        const existingRow = await env.DB.prepare(
          `SELECT id FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        )
          .bind(licenseId, projectId)
          .first<any>();

        if (!existingRow) {
          return notFound('License not found');
        }

        await env.DB.prepare('DELETE FROM licenses WHERE id = ? AND owner_yw_id = ?')
          .bind(licenseId, projectId)
          .run();

        return jsonResponse(200, { success: true });
      }

      if (path === '/api/licenses/check' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.serial !== 'string') {
          return badRequest('Serial is required');
        }

        const serial = body.serial.trim();
        const licenseRow = await env.DB.prepare(
          `SELECT * FROM licenses WHERE owner_yw_id = ? AND serial_number = ? LIMIT 1`
        )
          .bind(ownerYwId, serial)
          .first<any>();

        if (!licenseRow) {
          return jsonResponse(404, {
            valid: false,
            reason: 'Invalid serial',
          });
        }

        if (licenseRow.status !== 'active') {
          return jsonResponse(403, {
            valid: false,
            reason: 'License inactive',
            status: licenseRow.status,
          });
        }

        const now = new Date();
        const expiry = new Date(licenseRow.expiry_date);
        if (Number.isNaN(expiry.getTime())) {
          return jsonResponse(500, {
            valid: false,
            reason: 'Invalid expiry date',
          });
        }

        if (now > expiry) {
          await env.DB.prepare(
            `UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ? AND owner_yw_id = ?`
          )
            .bind(new Date().toISOString(), licenseRow.id, ownerYwId)
            .run();

          return jsonResponse(403, {
            valid: false,
            reason: 'License expired',
            expiry: licenseRow.expiry_date,
          });
        }

        return jsonResponse(200, {
          valid: true,
          user: licenseRow.user_name,
          expiry: licenseRow.expiry_date,
          plan: licenseRow.plan_type,
          status: licenseRow.status,
        });
      }

      if (path === '/api/events/export' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM events WHERE owner_yw_id = ? ORDER BY date ASC`
        )
          .bind(projectId)
          .all();

        const csvHeader = 'Title,Venue,Date,Start Time,End Time,Status,Payment Status,Contact Name,Contact Phone,Contact Email,Notes,Created By\n';
        const csvRows = results
          .map((row: any) => {
            const fields = [
              row.title,
              row.venue,
              row.date,
              row.start_time,
              row.end_time,
              row.status,
              row.payment_status,
              row.contact_name,
              row.contact_phone,
              row.contact_email,
              row.notes ?? '',
              row.created_by_display_name ?? '',
            ];
            return fields.map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',');
          })
          .join('\n');

        const csvContent = csvHeader + csvRows;
        return corsResponse(
          new Response(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="events.csv"',
            },
          })
        );
      }

      return notFound('Endpoint not found');
    } catch (error) {
      return internalError(error);
    }
  },
};
