-- Seed Data for UMKM Pilot (Phase 7A)

-- 1. Seed Demo Business Profile
INSERT INTO businesses (
    id,
    name,
    business_type,
    description,
    logo_url,
    address,
    whatsapp_number,
    opening_hours,
    currency,
    tax_enabled,
    tax_percentage,
    service_charge_enabled,
    service_charge_percentage,
    delivery_settings,
    eta_settings
) VALUES (
    'biz-1',
    'Kopi & Cemilan Pilot',
    'makanan_minuman',
    'Warung Kopi Pintar dengan sistem pemesanan modern QR Code.',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80',
    'Jl. Teknologi No. 42, Silicon Valley Indonesia, Jakarta',
    '6281234567890',
    '08.00 - 22.00',
    'IDR',
    true,
    10.00,
    true,
    5.00,
    '{"maxDeliveryDistanceKm": 10, "deliveryFeePerKm": 3000, "freeDeliveryThreshold": 50000, "freeDeliveryEnabled": true, "deliveryFeeCalculationType": "distance_based"}'::jsonb,
    '{"etaEnabled": true, "defaultPreparationMinutes": 15, "defaultDeliveryMinutesPerKm": 5, "bufferMinutes": 5}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Seed Staff Profiles
INSERT INTO profiles (
    id,
    business_id,
    full_name,
    role,
    email
) VALUES 
('profile-admin-1', 'biz-1', 'Budi Santoso', 'admin', 'budi.admin@umkmpilot.com'),
('profile-cashier-1', 'biz-1', 'Siti Rahma', 'cashier', 'siti.cashier@umkmpilot.com')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Products Aligned with SEED_PRODUCTS in db.ts
INSERT INTO products (
    id,
    business_id,
    name,
    category,
    description,
    price,
    stock,
    low_stock_threshold,
    image_url,
    is_active
) VALUES 
(
    'prod-1',
    'biz-1',
    'Es Kopi Susu Gula Aren',
    'Minuman',
    'Kopi susu dingin khas nusantara dengan rasa manis legit gula aren alami.',
    18000.00,
    25,
    5,
    'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-2',
    'biz-1',
    'Nasi Ayam Geprek Level 5',
    'Makanan',
    'Nasi ayam goreng renyah yang digeprek dengan cabai rawit super pedas level 5.',
    22000.00,
    15,
    5,
    'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-3',
    'biz-1',
    'Mie Goreng Spesial + Telur',
    'Makanan',
    'Mie goreng legendaris dengan tambahan telur dadar/mata sapi, sawi hijau, dan bawang goreng.',
    15000.00,
    30,
    5,
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-4',
    'biz-1',
    'Roti Bakar Cokelat Keju',
    'Snack',
    'Roti panggang mentega bertabur meises cokelat melimpah dan parutan keju gurih.',
    14000.00,
    10,
    5,
    'https://images.unsplash.com/photo-1584776296984-48cd02b0c497?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-5',
    'biz-1',
    'Es Teh Manis Jumbo',
    'Minuman',
    'Teh melati manis dingin berukuran gelas jumbo, pelepas dahaga yang sangat segar.',
    6000.00,
    50,
    10,
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-6',
    'biz-1',
    'Kopi Hitam Mandheling',
    'Minuman',
    'Kopi hitam single origin Arabika Sumatra Mandheling yang diseduh manual.',
    12000.00,
    20,
    5,
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    true
),
(
    'prod-7',
    'biz-1',
    'Paket Kenyang A (Geprek + Es Teh)',
    'Paket Promo',
    'Paket hemat kombinasi Nasi Ayam Geprek Level 5 dengan Es Teh Manis Jumbo.',
    25000.00,
    12,
    5,
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    image_url = EXCLUDED.image_url;
