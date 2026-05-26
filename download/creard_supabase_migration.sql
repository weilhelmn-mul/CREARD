-- ============================================================
-- CREARD - Esquema Completo para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'partially_paid', 'fully_paid',
    'completed', 'cancelled', 'no_show', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE slot_status AS ENUM (
    'available', 'reserved', 'in_play', 'finished', 'blocked', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('yape', 'plin', 'culqi', 'card', 'cash', 'transfer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('advance', 'remaining', 'full');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM ('mantenimiento', 'servicios', 'personal', 'alquiler', 'otros');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE court_sport AS ENUM ('futbol', 'voley');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- 2.1 branches (Sucursales)
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  address    TEXT NOT NULL,
  city       TEXT NOT NULL DEFAULT 'Cusco',
  phone      TEXT,
  email      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 courts (Canchas)
CREATE TABLE IF NOT EXISTS courts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  sport          court_sport NOT NULL,
  description    TEXT,
  branch_id      UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  images         JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  amenities      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courts_branch ON courts(branch_id);
CREATE INDEX IF NOT EXISTS idx_courts_sport ON courts(sport);
CREATE INDEX IF NOT EXISTS idx_courts_active ON courts(is_active);

-- 2.3 users (Usuarios)
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT,
  password   TEXT NOT NULL DEFAULT 'changeme',
  role       user_role NOT NULL DEFAULT 'user',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2.4 bookings (Reservas)
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id         UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  total_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           booking_status NOT NULL DEFAULT 'pending',
  payment_method   payment_method,
  notes            TEXT,
  slot_status      slot_status NOT NULL DEFAULT 'available',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_total_price CHECK (total_price >= 0),
  CONSTRAINT chk_advance CHECK (advance_amount <= total_price),
  CONSTRAINT chk_amounts CHECK (advance_amount + remaining_amount = total_price),
  CONSTRAINT chk_times CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_bookings_court ON bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings(court_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_overlap ON bookings(court_id, date, start_time, end_time);

-- 2.5 payments (Pagos)
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  type         payment_type NOT NULL,
  method       payment_method NOT NULL,
  status       payment_status NOT NULL DEFAULT 'pending',
  external_ref TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 2.6 expenses (Gastos)
CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  category    expense_category NOT NULL,
  date        DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_expense_amount CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- 2.7 reviews (Reseñas)
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id   UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL DEFAULT '',
  rating     SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_review_user_court UNIQUE (user_id, court_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_court ON reviews(court_id);

-- 2.8 news (Noticias)
CREATE TABLE IF NOT EXISTS news (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  image_url    TEXT,
  category     TEXT NOT NULL DEFAULT 'general',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  priority     INTEGER NOT NULL DEFAULT 0,
  published_at DATE,
  expires_at   DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 gallery (Galería)
CREATE TABLE IF NOT EXISTS gallery (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  category      TEXT NOT NULL DEFAULT 'general',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.10 site_settings (Configuración)
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT 'main'::uuid,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_courts_updated_at BEFORE UPDATE ON courts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 4. DATOS INICIALES (Seed)
-- ============================================================

-- Insertar sucursal principal (solo si no existe)
INSERT INTO branches (name, address, city, phone, email)
SELECT 'CREARD', 'Av. Bolivar C1, San Sebastian', 'Cusco', '+51 984 123 456', 'info@creard.pe'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name = 'CREARD');

-- Insertar canchas (solo si no existen)
INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities)
SELECT 'Cancha Fútbol 1', 'futbol',
  'Cancha premium con césped sintético de última generación. Iluminación LED, vestuarios con duchas y marcador electrónico.',
  b.id, '["/cancha-futbol-1.png"]'::jsonb, 60.00,
  '["Césped sintético", "Iluminación LED", "Vestuarios", "Duchas", "Estacionamiento"]'::jsonb
FROM branches b WHERE b.name = 'CREARD' AND NOT EXISTS (SELECT 1 FROM courts WHERE name = 'Cancha Fútbol 1');

INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities)
SELECT 'Cancha Fútbol 2', 'futbol',
  'Cancha estándar de fútbol 5 con césped sintético. Amplia zona de calentamiento.',
  b.id, '["/cancha-futbol-2.png"]'::jsonb, 50.00,
  '["Césped sintético", "Iluminación LED", "Vestuarios"]'::jsonb
FROM branches b WHERE b.name = 'CREARD' AND NOT EXISTS (SELECT 1 FROM courts WHERE name = 'Cancha Fútbol 2');

INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities)
SELECT 'Cancha Fútbol 3', 'futbol',
  'Cancha techada parcial con piso tarima profesional. Climatización y sonido ambiental.',
  b.id, '["/cancha-futbol-3.png"]'::jsonb, 55.00,
  '["Césped sintético", "Techado parcial", "Vestuarios", "Iluminación LED"]'::jsonb
FROM branches b WHERE b.name = 'CREARD' AND NOT EXISTS (SELECT 1 FROM courts WHERE name = 'Cancha Fútbol 3');

INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities)
SELECT 'Cancha Fútbol 4', 'futbol',
  'Nueva cancha con las mejores instalaciones. Césped premium y excelente iluminación nocturna.',
  b.id, '["/cancha-futbol-4.png"]'::jsonb, 65.00,
  '["Césped premium", "Iluminación LED", "Duchas", "Estacionamiento", "Cafetería"]'::jsonb
FROM branches b WHERE b.name = 'CREARD' AND NOT EXISTS (SELECT 1 FROM courts WHERE name = 'Cancha Fútbol 4');

INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities)
SELECT 'Cancha Vóley 1', 'voley',
  'Cancha profesional de vóley con piso PVC y red reglamentaria.',
  b.id, '["/cancha-voley.png"]'::jsonb, 40.00,
  '["Piso PVC", "Red reglamentaria", "Iluminación LED", "Techado"]'::jsonb
FROM branches b WHERE b.name = 'CREARD' AND NOT EXISTS (SELECT 1 FROM courts WHERE name = 'Cancha Vóley 1');

INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities)
SELECT 'Cancha Vóley 2', 'voley',
  'Segunda cancha de vóley techada con piso PVC. Perfecta para entrenamientos.',
  b.id, '["/cancha-voley.png"]'::jsonb, 35.00,
  '["Piso PVC", "Iluminación LED", "Techado", "Vestuarios"]'::jsonb
FROM branches b WHERE b.name = 'CREARD' AND NOT EXISTS (SELECT 1 FROM courts WHERE name = 'Cancha Vóley 2');

-- Insertar settings iniciales
INSERT INTO site_settings (id, data)
SELECT 'main'::uuid, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 'main'::uuid);
