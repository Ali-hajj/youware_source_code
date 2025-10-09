INSERT IGNORE INTO users (id, email, password_hash, first_name, last_name, role)
VALUES
('11111111-1111-1111-1111-111111111111', 'admin@example.com', '$2y$10$54DE4us/HZlXf2HONtl0du5Qd0dwftQNCQn8uCjr0MzRiG8jKQTPG', 'Admin', 'User', 'admin');
-- Password: Admin123!

INSERT IGNORE INTO licenses (id, key_value, company_name, expires_at, seats, status)
VALUES
('22222222-2222-2222-2222-222222222222', 'LIC-2025-GOLD-001', 'Acme Entertainment', '2026-12-31', 10, 'active'),
('33333333-3333-3333-3333-333333333333', 'LIC-2024-SILVER-002', 'Prime Events Co', '2025-06-30', 5, 'active'),
('44444444-4444-4444-4444-444444444444', 'LIC-2023-BRONZE-003', 'Legacy Venues', '2024-01-31', 3, 'expired');

INSERT IGNORE INTO events (id, user_id, title, venue, venue_id, color, date, start_time, end_time,
                            status, payment_status, payment_method, contact_name, contact_phone, contact_email,
                            pricing_data, notes)
VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Corporate Launch Party',
 'Grand Ballroom', 'VEN-001', '#0ea5e9', '2025-11-15', '18:00', '23:00',
 'confirmed', 'paid', 'credit_card', 'Jane Smith', '313-555-0100', 'jane@corporate.com',
 JSON_OBJECT('package', 'Premium', 'total', 8500, 'deposit', 2000),
 'VIP seating with champagne service'),

('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Wedding Reception',
 'Lakeside Pavilion', 'VEN-002', '#f97316', '2025-12-02', '16:00', '22:00',
 'pending', 'partial', 'bank_transfer', 'Michael Johnson', '248-555-0112', 'mike@wedplanner.com',
 JSON_OBJECT('package', 'Gold', 'total', 12000, 'balance_due', 6000),
 'Client requested string-light canopy and dessert bar.');
