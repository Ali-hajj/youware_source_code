-- Event Management System Database Schema (SQLite/D1)
-- Converted from MySQL syntax for Cloudflare D1 compatibility
-- Last Updated: 2025-10-02

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'host', 'operator')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_default_admin INTEGER NOT NULL DEFAULT 0,
  owner_yw_id TEXT NOT NULL,
  UNIQUE(owner_yw_id, username)
) STRICT;

-- Insert default admin user
INSERT INTO users VALUES (
  'EVN001', 'admin', 'admin', 'System', 'Administrator', '000-000-0000',
  'admin@example.com', 'f8ed48754b8ede5584d7231c2af14642201f78bb5c4d063f4b58076f98151bb2',
  'default-admin-salt', '2025-10-01 01:15:10', '2025-10-01 01:15:10', 1,
  'Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw'
);

-- ============================================================
-- SEED USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS seed_users (
  username TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'host', 'operator')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  is_default_admin INTEGER NOT NULL DEFAULT 0
) STRICT;

-- Insert seed admin user
INSERT INTO seed_users VALUES (
  'admin', 'admin', 'System', 'Administrator', '000-000-0000',
  'admin@example.com',
  'f8ed48754b8ede5584d7231c2af14642201f78bb5c4d063f4b58076f98151bb2',
  'default-admin-salt', 1
);

-- ============================================================
-- USER TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_yw_id TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- Insert sample token (expires on 2025-10-01)
INSERT INTO user_tokens VALUES (
  '3dbbf83cfa4bbd08f8e10e16e762c353a43b3d529445429d2d471a8dffb5d9ea',
  'EVN001',
  1759325845880,
  '2025-10-01 01:37:26',
  'Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw'
);



-- ============================================================
-- EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  venue_id TEXT NOT NULL,
  color TEXT,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'partial')),
  payment_method TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  pricing_data TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,
  owner_yw_id TEXT,
  created_by_user_id TEXT,
  created_by_display_name TEXT,
  created_by_role TEXT,
  updated_by_user_id TEXT,
  updated_by_display_name TEXT,
  updated_by_role TEXT
) STRICT;

-- Insert sample events
INSERT INTO events VALUES('test-event-123','Test Event','restaurant','restaurant',NULL,'2025-09-25','18:00','22:00','confirmed','paid',NULL,'Test User','313-555-0123','test@example.com',NULL,'Test event to verify database connection','2025-09-24 17:39:00','2025-09-24 17:39:00','test-user-id',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO events VALUES('event-1758790478485-4z7k10ge4','上大学','restaurant','restaurant',NULL,'2025-09-09','18:00','21:00','pending','unpaid',NULL,'是','131-212-3056','gxlhyl@gmail.com','{"mode":"person","menuItems":[],"personCount":1,"pricePerPerson":0,"customPlatters":[],"subtotal":0,"discount":{"type":"percentage","value":0,"amount":0},"taxRate":0.06,"taxAmount":0,"includeTax":true,"total":0,"deposits":[],"amountPaid":0,"remainingBalance":0}',NULL,'2025-09-25T08:54:38.485Z','2025-09-25T08:54:38.485Z','CEN2GYEf9emMGp4LGoUGyjIzOZoXYKKXEF6vkw0n1PRnO9hHJt-L1znpk8XSPSqlLqxusQ',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO events VALUES('event-1758834249445-71pvs8obs','Ayman and Noor','banquet','banquet',NULL,'2025-09-26','18:00','23:00','pending','unpaid',NULL,'Ayman Joudi','408-717-2096','ajoudi@live.com','{"mode":"person","menuItems":[{"id":"bcf952f3-cc4c-42b2-b0ff-ac72afbd89ec","name":"Hummus","price":0,"quantity":4,"description":"Large trays"},{"id":"320a6bae-6dff-46af-b5de-4deec9ca1ef9","name":"Fatayer","price":0,"quantity":5,"description":"5 Dozens"},{"id":"4c5609cf-410a-4806-919d-2ce2b88d8ddb","name":"Rise and meat","price":0,"quantity":1,"description":"2 large Trays"},{"id":"45070310-b268-4ad8-a8f6-4a22ae531276","name":"Shrimp App","price":25,"quantity":5,"description":"5 Dzoen"}],"personCount":50,"pricePerPerson":25,"customPlatters":[],"subtotal":1375,"discount":{"type":"percentage","value":20,"amount":275},"taxRate":0.06,"taxAmount":66,"includeTax":true,"total":1166,"deposits":[{"id":"34408977-6d03-473b-bfef-ff4c6e1ebc4f","amount":500,"method":"cash","date":"2025-09-25","notes":""}],"amountPaid":500,"remainingBalance":666}','Ayman will bring all the flower and decorations ','2025-09-25T21:04:09.446Z','2025-09-25T21:04:09.446Z','Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO events VALUES('event-1758835055948-d6udxstlh','Firas weeding','restaurant','restaurant',NULL,'2025-09-25','18:00','21:00','pending','unpaid',NULL,'MIKE AKANAN','313-938-6666','mikeakanan@yahoo.com','{"mode":"person","menuItems":[],"personCount":25,"pricePerPerson":25,"customPlatters":[],"subtotal":625,"discount":{"type":"percentage","value":0,"amount":0},"taxRate":0.06,"taxAmount":37.5,"includeTax":true,"total":662.5,"deposits":[],"amountPaid":0,"remainingBalance":662.5}',NULL,'2025-09-25T21:17:35.948Z','2025-09-25T21:17:35.948Z','Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw',NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_user_tokens_owner ON user_tokens(owner_yw_id);
CREATE INDEX idx_users_owner ON users(owner_yw_id);

-- ============================================================
-- LICENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  serial_number TEXT NOT NULL,
  user_name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK(plan_type IN ('monthly', 'yearly')),
  start_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'disabled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_yw_id TEXT NOT NULL,
  UNIQUE(owner_yw_id, serial_number)
) STRICT;

CREATE INDEX idx_licenses_owner ON licenses(owner_yw_id);

-- Seed starter licenses
DELETE FROM licenses;
INSERT INTO licenses (id, serial_number, user_name, plan_type, start_date, expiry_date, status, notes, created_at, updated_at, owner_yw_id)
VALUES
  ('LIC-0001', 'ALPHA1-YEAR-20251001', 'alpha@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Pilot customer yearly plan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0002', 'BRAVO1-MONTH-20251001', 'bravo@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly retainer license', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0003', 'CHARLIE1-YEAR-20251001', 'charlie@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Annual enterprise bundle', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0004', 'DELTA1-MONTH-20251001', 'delta@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly cloud render node', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0005', 'ECHO1-YEAR-20251001', 'echo@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Paid upfront yearly seat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0006', 'FOXTROT1-MONTH-20251001', 'foxtrot@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly analytics tenant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0007', 'GOLF1-YEAR-20251001', 'golf@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Yearly lab automation seat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0008', 'HOTEL1-MONTH-20251001', 'hotel@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly GPU workstation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0009', 'INDIA1-YEAR-20251001', 'india@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Annual robotics deployment', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0010', 'JULIET1-MONTH-20251001', 'juliet@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly media rendering seat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0011', 'KILO1-YEAR-20251001', 'kilo@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Annual research GPU cluster', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0012', 'LIMA1-MONTH-20251001', 'lima@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly simulation workload', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0013', 'MIKE1-YEAR-20251001', 'mike@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Annual OEM partnership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0014', 'NOVEMBER1-MONTH-20251001', 'november@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Single-node robotics harness', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0015', 'OSCAR1-YEAR-20251001', 'oscar@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Yearly finance risk seat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0016', 'PAPA1-MONTH-20251001', 'papa@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly drone fleet license', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0017', 'QUEBEC1-YEAR-20251001', 'quebec@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Annual vision AI rollout', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0018', 'ROMEO1-MONTH-20251001', 'romeo@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly ML inference seat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0019', 'SIERRA1-YEAR-20251001', 'sierra@client.com', 'yearly', '2025-10-01', '2026-10-01', 'active', 'Yearly defense simulation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER'),
  ('LIC-0020', 'TANGO1-MONTH-20251001', 'tango@client.com', 'monthly', '2025-10-01', '2025-11-01', 'active', 'Monthly backup seat for standby rigs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SEED_OWNER');
