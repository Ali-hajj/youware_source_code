-- USERS TABLE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INSERT USER
INSERT INTO users VALUES (
  'EVN001', 'admin', 'admin', 'System', 'Administrator', '000-000-0000',
  'admin@example.com', 'f8ed48754b8ede5584d7231c2af14642201f78bb5c4d063f4b58076f98151bb2',
  'default-admin-salt', '2025-10-01 01:15:10', '2025-10-01 01:15:10', 1,
  'Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw'
);

-- SEED USERS TABLE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INSERT SEED USER
INSERT INTO seed_users VALUES (
  'admin', 'admin', 'System', 'Administrator', '000-000-0000',
  'admin@example.com',
  'f8ed48754b8ede5584d7231c2af14642201f78bb5c4d063f4b58076f98151bb2',
  'default-admin-salt', 1
);

-- USER TOKENS TABLE
CREATE TABLE IF NOT EXISTS user_tokens (
  token_hash VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_yw_id VARCHAR(255) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INSERT USER TOKEN
INSERT INTO user_tokens VALUES (
  '3dbbf83cfa4bbd08f8e10e16e762c353a43b3d529445429d2d471a8dffb5d9ea',
  'EVN001',
  1759325845880,
  '2025-10-01 01:37:26',
  'Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw'
);

-- BOOTSTRAP TOKENS TABLE
CREATE TABLE IF NOT EXISTS bootstrap_tokens (
  token_hash VARCHAR(255) PRIMARY KEY,
  owner_yw_id VARCHAR(255) NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- EVENTS TABLE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO events VALUES('test-event-123','Test Event','restaurant','restaurant',NULL,'2025-09-25','18:00','22:00','confirmed','paid',NULL,'Test User','313-555-0123','test@example.com',NULL,'Test event to verify database connection','2025-09-24 17:39:00','2025-09-24 17:39:00','test-user-id',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO events VALUES('event-1758790478485-4z7k10ge4','上大学','restaurant','restaurant',NULL,'2025-09-09','18:00','21:00','pending','unpaid',NULL,'是','131-212-3056','gxlhyl@gmail.com','{"mode":"person","menuItems":[],"personCount":1,"pricePerPerson":0,"customPlatters":[],"subtotal":0,"discount":{"type":"percentage","value":0,"amount":0},"taxRate":0.06,"taxAmount":0,"includeTax":true,"total":0,"deposits":[],"amountPaid":0,"remainingBalance":0}',NULL,'2025-09-25T08:54:38.485Z','2025-09-25T08:54:38.485Z','CEN2GYEf9emMGp4LGoUGyjIzOZoXYKKXEF6vkw0n1PRnO9hHJt-L1znpk8XSPSqlLqxusQ',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO events VALUES('event-1758834249445-71pvs8obs','Ayman and Noor','banquet','banquet',NULL,'2025-09-26','18:00','23:00','pending','unpaid',NULL,'Ayman Joudi','408-717-2096','ajoudi@live.com','{"mode":"person","menuItems":[{"id":"bcf952f3-cc4c-42b2-b0ff-ac72afbd89ec","name":"Hummus","price":0,"quantity":4,"description":"Large trays"},{"id":"320a6bae-6dff-46af-b5de-4deec9ca1ef9","name":"Fatayer","price":0,"quantity":5,"description":"5 Dozens"},{"id":"4c5609cf-410a-4806-919d-2ce2b88d8ddb","name":"Rise and meat","price":0,"quantity":1,"description":"2 large Trays"},{"id":"45070310-b268-4ad8-a8f6-4a22ae531276","name":"Shrimp App","price":25,"quantity":5,"description":"5 Dzoen"}],"personCount":50,"pricePerPerson":25,"customPlatters":[],"subtotal":1375,"discount":{"type":"percentage","value":20,"amount":275},"taxRate":0.06,"taxAmount":66,"includeTax":true,"total":1166,"deposits":[{"id":"34408977-6d03-473b-bfef-ff4c6e1ebc4f","amount":500,"method":"cash","date":"2025-09-25","notes":""}],"amountPaid":500,"remainingBalance":666}','Ayman will bring all the flower and decorations ','2025-09-25T21:04:09.446Z','2025-09-25T21:04:09.446Z','Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO events VALUES('event-1758835055948-d6udxstlh','Firas weeding','restaurant','restaurant',NULL,'2025-09-25','18:00','21:00','pending','unpaid',NULL,'MIKE AKANAN','313-938-6666','mikeakanan@yahoo.com','{"mode":"person","menuItems":[],"personCount":25,"pricePerPerson":25,"customPlatters":[],"subtotal":625,"discount":{"type":"percentage","value":0,"amount":0},"taxRate":0.06,"taxAmount":37.5,"includeTax":true,"total":662.5,"deposits":[],"amountPaid":0,"remainingBalance":662.5}',NULL,'2025-09-25T21:17:35.948Z','2025-09-25T21:17:35.948Z','Uh53QYVNoreMHZoJHIUGmGI3OZoSZ6CXRlmvxwlxhaViO4lBPt1g4T3682_ZnUNVzYJ6nw',NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- FIXED INDEXES (with prefix length)
CREATE INDEX idx_user_tokens_owner ON user_tokens (owner_yw_id(191));
CREATE INDEX idx_users_owner ON users (owner_yw_id(191));
