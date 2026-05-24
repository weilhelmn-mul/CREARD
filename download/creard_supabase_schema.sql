-- ============================================================
-- CREARD - Esquema de Base de Datos para Supabase (PostgreSQL)
-- Plataforma de Gestión de Canchas Deportivas
-- Ubicación: Av. Bolivar C1, San Sebastián, Cusco
-- ============================================================

-- ============================================================
-- 1. ENUMS (Tipos enumerados)
-- ============================================================

-- Roles de usuario
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Estado de la reserva (vista del cliente)
CREATE TYPE booking_status AS ENUM (
  'pending',         -- Pendiente (recién creada)
  'confirmed',       -- Confirmada por el admin
  'partially_paid',  -- Adelanto del 50% pagado
  'fully_paid',      -- Pago completo
  'completed',       -- Partido finalizado
  'cancelled',       -- Cancelada
  'no_show',         -- No se presentó
  'expired'          -- Vencida (no pagó a tiempo)
);

-- Estado del slot/horario (vista del admin)
CREATE TYPE slot_status AS ENUM (
  'available',       -- Disponible
  'reserved',        -- Reservado (confirmado pero sin pago)
  'in_play',         -- En juego (partido en curso)
  'finished',        -- Finalizado
  'blocked',         -- Bloqueado (mantenimiento, evento, etc.)
  'expired'          -- Vencido
);

-- Métodos de pago
CREATE TYPE payment_method AS ENUM (
  'yape',
  'plin',
  'culqi',
  'card',
  'cash',
  'transfer'
);

-- Estado del pago
CREATE TYPE payment_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

-- Tipo de pago
CREATE TYPE payment_type AS ENUM (
  'advance',    -- Adelanto (50%)
  'remaining',  -- Saldo restante (50%)
  'full'        -- Pago completo (100%)
);

-- Categoría de gasto
CREATE TYPE expense_category AS ENUM (
  'mantenimiento',
  'servicios',
  'personal',
  'alquiler',
  'otros'
);

-- Deporte de la cancha
CREATE TYPE court_sport AS ENUM (
  'futbol',
  'voley'
);

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- -----------------------------------------------------------
-- 2.1 TABLA: branches (Sucursales)
-- Permite escalar a múltiples sedes en el futuro
-- -----------------------------------------------------------
CREATE TABLE branches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  address    TEXT        NOT NULL,
  city       TEXT        NOT NULL DEFAULT 'Cusco',
  phone      TEXT,
  email      TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE branches IS 'Sucursales/locales de CREARD';
COMMENT ON COLUMN branches.is_active IS 'Indica si la sucursal está operativa';

-- -----------------------------------------------------------
-- 2.2 TABLA: courts (Canchas)
-- 4 canchas de fútbol 5 + 2 canchas de vóley
-- -----------------------------------------------------------
CREATE TABLE courts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  sport        court_sport NOT NULL,
  description  TEXT,
  branch_id    UUID        NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  images       JSONB       NOT NULL DEFAULT '[]'::jsonb,
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  amenities    JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE courts IS 'Canchas deportivas (fútbol 5 y vóley)';
COMMENT ON COLUMN courts.sport IS 'Tipo de deporte: futbol o voley';
COMMENT ON COLUMN courts.images IS 'Array JSON de URLs de imágenes';
COMMENT ON COLUMN courts.amenities IS 'Array JSON de servicios/amenidades';
COMMENT ON COLUMN courts.price_per_hour IS 'Precio por hora en soles (S/)';

-- Índice para buscar canchas por sucursal
CREATE INDEX idx_courts_branch ON courts(branch_id);
CREATE INDEX idx_courts_sport ON courts(sport);
CREATE INDEX idx_courts_active ON courts(is_active);

-- -----------------------------------------------------------
-- 2.3 TABLA: users (Usuarios)
-- Clientes y administradores del sistema
-- -----------------------------------------------------------
CREATE TABLE users (
  id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT       NOT NULL,
  email       TEXT       NOT NULL UNIQUE,
  phone       TEXT,
  password    TEXT       NOT NULL,  -- Hash bcrypt
  role        user_role  NOT NULL DEFAULT 'user',
  is_active   BOOLEAN    NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Usuarios del sistema (clientes y administradores)';
COMMENT ON COLUMN users.password IS 'Contraseña hasheada con bcrypt';
COMMENT ON COLUMN users.role IS 'user = cliente, admin = administrador';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- -----------------------------------------------------------
-- 2.4 TABLA: bookings (Reservas)
-- Gestión de reservas con flujo de pago 50% adelanto
-- -----------------------------------------------------------
CREATE TABLE bookings (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id         UUID           NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE           NOT NULL,           -- YYYY-MM-DD
  start_time       TIME           NOT NULL,           -- HH:MM
  end_time         TIME           NOT NULL,           -- HH:MM
  total_price      NUMERIC(10,2)  NOT NULL DEFAULT 0,
  advance_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(10,2)  NOT NULL DEFAULT 0,
  status           booking_status NOT NULL DEFAULT 'pending',
  payment_method   payment_method,
  notes            TEXT,
  slot_status      slot_status    NOT NULL DEFAULT 'available',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),

  -- Restricción: el precio total debe ser >= 0
  CONSTRAINT chk_total_price CHECK (total_price >= 0),

  -- Restricción: el adelanto no puede superar el total
  CONSTRAINT chk_advance CHECK (advance_amount <= total_price),

  -- Restricción: la suma de adelanto + restante debe ser igual al total
  CONSTRAINT chk_amounts CHECK (
    advance_amount + remaining_amount = total_price
  ),

  -- Restricción: hora de fin > hora de inicio
  CONSTRAINT chk_times CHECK (end_time > start_time)
);

COMMENT ON TABLE bookings IS 'Reservas de canchas con flujo de pago 50% adelanto + 50% saldo';
COMMENT ON COLUMN bookings.status IS 'Estado de la reserva visible para el cliente';
COMMENT ON COLUMN bookings.slot_status IS 'Estado del slot/horario visible para el admin';
COMMENT ON COLUMN bookings.advance_amount IS 'Monto del adelanto (50% del total)';
COMMENT ON COLUMN bookings.remaining_amount IS 'Saldo pendiente (50% del total)';

-- Índices para consultas frecuentes
CREATE INDEX idx_bookings_court ON bookings(court_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_slot_status ON bookings(slot_status);
CREATE INDEX idx_bookings_court_date ON bookings(court_id, date);

-- Restricción UNIQUE: no duplicar reserva en misma cancha, misma fecha y hora
-- Se maneja a nivel de aplicación, pero aquí está el índice para optimizar
CREATE UNIQUE INDEX idx_bookings_no_overlap ON bookings(court_id, date, start_time, end_time);

-- -----------------------------------------------------------
-- 2.5 TABLA: payments (Pagos)
-- Registro de cada transacción (adelanto, saldo o pago completo)
-- -----------------------------------------------------------
CREATE TABLE payments (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID           NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id      UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2)  NOT NULL DEFAULT 0,
  type         payment_type   NOT NULL,
  method       payment_method NOT NULL,
  status       payment_status NOT NULL DEFAULT 'pending',
  external_ref TEXT,           -- Referencia del pago externo (YAP-001, PLN-001, etc.)
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),

  -- Restricción: el monto debe ser positivo
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

COMMENT ON TABLE payments IS 'Registro detallado de cada transacción';
COMMENT ON COLUMN payments.type IS 'advance = adelanto 50%, remaining = saldo 50%, full = pago completo';
COMMENT ON COLUMN payments.external_ref IS 'Código de referencia del medio de pago (ej: YAP-001)';

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_date ON payments(created_at);

-- -----------------------------------------------------------
-- 2.6 TABLA: expenses (Gastos)
-- Control de gastos operativos del negocio
-- -----------------------------------------------------------
CREATE TABLE expenses (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT             NOT NULL,
  amount      NUMERIC(10,2)    NOT NULL DEFAULT 0,
  category    expense_category NOT NULL,
  date        DATE             NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),

  -- Restricción: el monto debe ser positivo
  CONSTRAINT chk_expense_amount CHECK (amount > 0)
);

COMMENT ON TABLE expenses IS 'Gastos operativos del negocio';
COMMENT ON COLUMN expenses.category IS 'mantenimiento, servicios, personal, alquiler, otros';

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);

-- -----------------------------------------------------------
-- 2.7 TABLA: reviews (Reseñas)
-- Calificaciones y comentarios de los clientes
-- -----------------------------------------------------------
CREATE TABLE reviews (
  id         UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id   UUID       NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  user_id    UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT   NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un usuario solo puede reseñar una cancha una vez
  CONSTRAINT uq_review_user_court UNIQUE (user_id, court_id)
);

COMMENT ON TABLE reviews IS 'Reseñas y calificaciones de canchas por clientes';
COMMENT ON COLUMN reviews.rating IS 'Calificación de 1 a 5 estrellas';

CREATE INDEX idx_reviews_court ON reviews(court_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);

-- ============================================================
-- 3. TRIGGERS (Disparadores automáticos)
-- ============================================================

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas las tablas con updated_at
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. VISTAS ÚTILES
-- ============================================================

-- Vista: Resumen financiero diario
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT
  b.date,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(e.amount), 0) AS total_expenses,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
    - COALESCE(SUM(e.amount), 0) AS balance
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'completed'
LEFT JOIN expenses e ON e.date = b.date
GROUP BY b.date
ORDER BY b.date DESC;

COMMENT ON VIEW v_daily_summary IS 'Resumen financiero diario: ingresos, gastos y balance';

-- Vista: Ranking de canchas por ingresos
CREATE OR REPLACE VIEW v_court_revenue_ranking AS
SELECT
  c.id,
  c.name,
  c.sport,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_revenue,
  ROUND(AVG(r.rating), 1) AS avg_rating,
  COUNT(DISTINCT r.id) AS total_reviews
FROM courts c
LEFT JOIN bookings b ON b.court_id = c.id
LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'completed'
LEFT JOIN reviews r ON r.court_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.sport
ORDER BY total_revenue DESC;

COMMENT ON VIEW v_court_revenue_ranking IS 'Ranking de canchas por ingresos totales y calificación promedio';

-- Vista: Estado actual del día para el admin
CREATE OR REPLACE VIEW v_today_status AS
SELECT
  c.id AS court_id,
  c.name AS court_name,
  c.sport,
  b.id AS booking_id,
  b.date,
  b.start_time,
  b.end_time,
  b.status AS booking_status,
  b.slot_status,
  COALESCE(u.name, '-') AS client_name,
  COALESCE(u.phone, '-') AS client_phone,
  b.total_price,
  b.advance_amount,
  b.remaining_amount,
  b.payment_method
FROM courts c
LEFT JOIN bookings b ON b.court_id = c.id AND b.date = CURRENT_DATE
LEFT JOIN users u ON u.id = b.user_id
WHERE c.is_active = true
ORDER BY c.sport, c.name, b.start_time;

COMMENT ON VIEW v_today_status IS 'Vista del estado actual de todas las canchas para el día de hoy';

-- ============================================================
-- 5. DATOS INICIALES (Seed)
-- ============================================================

-- Insertar sucursal principal
INSERT INTO branches (name, address, city, phone, email) VALUES
('CREARD', 'Av. Bolivar C1, San Sebastian', 'Cusco', '+51 984 123 456', 'info@creard.com');

-- Insertar canchas (4 fútbol 5 + 2 vóley)
INSERT INTO courts (name, sport, description, branch_id, images, price_per_hour, amenities) VALUES
(
  'Cancha de Futbol 1',
  'futbol',
  'Cancha de futbol 5 con cesped sintetico de ultima generacion. Iluminacion LED, vestuarios con duchas y marcador electronico. Ideal para partidos amateurs y torneos.',
  (SELECT id FROM branches WHERE name = 'CREARD'),
  '["/cancha-futbol-1.png"]'::jsonb,
  45.00,
  '["Wi-Fi", "Estacionamiento", "Vestuarios", "Iluminacion LED", "Duchas", "Marcador", "Cafeteria"]'::jsonb
),
(
  'Cancha de Futbol 2',
  'futbol',
  'Cancha de futbol 5 con cesped sintetico premium e iluminacion de ultima generacion. Amplia zona de calentamiento y vestuarios completos.',
  (SELECT id FROM branches WHERE name = 'CREARD'),
  '["/cancha-futbol-2.png"]'::jsonb,
  50.00,
  '["Wi-Fi", "Estacionamiento", "Vestuarios", "Iluminacion LED", "Duchas", "Zona de calentamiento", "Cafeteria"]'::jsonb
),
(
  'Cancha de Futbol 3',
  'futbol',
  'Cancha de futbol 5 techada con piso tarima profesional. Climatizacion, sonido ambiental y vestuarios premium.',
  (SELECT id FROM branches WHERE name = 'CREARD'),
  '["/cancha-futbol-3.png"]'::jsonb,
  55.00,
  '["Climatizacion", "Vestuarios Premium", "Wi-Fi", "Sonido", "Iluminacion LED", "Estacionamiento"]'::jsonb
),
(
  'Cancha de Futbol 4',
  'futbol',
  'Cancha de futbol 5 al aire libre con cesped sintetico de alta calidad, excelente iluminacion nocturna. Ideal para torneos oficiales.',
  (SELECT id FROM branches WHERE name = 'CREARD'),
  '["/cancha-futbol-4.png"]'::jsonb,
  55.00,
  '["Wi-Fi", "Estacionamiento", "Vestuarios", "Duchas", "Iluminacion LED", "Cafeteria", "Zona de calentamiento"]'::jsonb
),
(
  'Cancha de Voley A',
  'voley',
  'Cancha profesional de voley con piso PVC, red FIVV homologada, tribunas para 200 espectadores y sistema de sonido profesional.',
  (SELECT id FROM branches WHERE name = 'CREARD'),
  '["/cancha-voley.png"]'::jsonb,
  35.00,
  '["Wi-Fi", "Estacionamiento", "Tribunas", "Sonido", "Iluminacion", "Red FIVV"]'::jsonb
),
(
  'Cancha de Voley B',
  'voley',
  'Cancha de voley techada con piso PVC y excelente iluminacion. Perfecta para entrenamientos y partidos amistosos.',
  (SELECT id FROM branches WHERE name = 'CREARD'),
  '["/cancha-voley.png"]'::jsonb,
  30.00,
  '["Wi-Fi", "Estacionamiento", "Iluminacion", "Vestuarios", "Climatizacion"]'::jsonb
);

-- Nota: Los usuarios se crean desde la app con contraseñas hasheadas con bcrypt.
-- Los siguientes son ejemplos con hash bcrypt de las contraseñas de prueba.
-- admin123 -> hash bcrypt generado con cost factor 10
-- user123  -> hash bcrypt generado con cost factor 10
--
-- IMPORTANTE: Reemplaza estos hashes con los generados por tu backend (bcrypt.hashSync)
--
-- INSERT INTO users (name, email, phone, password, role) VALUES
-- ('Administrador CREARD', 'admin@creard.com', '+51 984 000 000', '$2b$10$XXXXXXXX', 'admin'),
-- ('Carlos Mendoza', 'carlos@email.com', '+51 984 111 222', '$2b$10$YYYYYYYY', 'user'),
-- ('Maria Garcia', 'maria@email.com', '+51 984 333 444', '$2b$10$ZZZZZZZZ', 'user');

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) - Políticas de seguridad
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para lectura (las canchas y sucursales son públicas)
CREATE POLICY "Public read access to branches"
  ON branches FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to courts"
  ON courts FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Política: los usuarios autenticados pueden leer courts (incluyendo inactivas para admin)
CREATE POLICY "Authenticated read all courts"
  ON courts FOR SELECT
  TO authenticated
  USING (true);

-- Política: los usuarios solo pueden leer su propia información
CREATE POLICY "Users read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: los usuarios pueden insertar su propio perfil (via registro)
CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Política: los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: los clientes pueden ver sus propias reservas
CREATE POLICY "Users read own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: los clientes pueden crear reservas
CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Política: los clientes pueden actualizar sus propias reservas (cancelar)
CREATE POLICY "Users update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: admin puede gestionar todas las reservas
CREATE POLICY "Admin full access to bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: usuarios pueden ver sus propios pagos
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: usuarios pueden crear pagos
CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Política: admin puede gestionar todos los pagos
CREATE POLICY "Admin full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: admin puede gestionar gastos
CREATE POLICY "Admin full access to expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: solo admin puede ver gastos
CREATE POLICY "Admin read expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Política: usuarios pueden ver reseñas
CREATE POLICY "Public read reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política: usuarios pueden crear sus propias reseñas
CREATE POLICY "Users create own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 7. FUNCIONES UTILITARIAS
-- ============================================================

-- Función: Obtener disponibilidad de una cancha por fecha
CREATE OR REPLACE FUNCTION get_court_availability(
  p_court_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN,
  booking_id UUID,
  client_name TEXT,
  slot_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.start_time,
    ts.end_time,
    (b.id IS NULL) AS is_available,
    b.id,
    u.name,
    COALESCE(b.slot_status::TEXT, 'available')
  FROM (
    -- Generar slots de 1 hora desde las 08:00 hasta las 22:00
    SELECT
      make_time(g.h, 0, 0) AS start_time,
      make_time(g.h + 1, 0, 0) AS end_time
    FROM generate_series(8, 21) AS g(h)
  ) ts
  LEFT JOIN bookings b ON
    b.court_id = p_court_id AND
    b.date = p_date AND
    b.start_time = ts.start_time AND
    b.status NOT IN ('cancelled')
  LEFT JOIN users u ON u.id = b.user_id
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_court_availability IS
  'Retorna los slots horarios de una cancha para una fecha específica';

-- Función: Calcular balance financiero en un rango de fechas
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  balance NUMERIC,
  pending_income NUMERIC,
  total_bookings BIGINT,
  completed_bookings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0),
    COALESCE(SUM(e.amount), 0),
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0)
      - COALESCE(SUM(e.amount), 0),
    COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END), 0),
    COUNT(DISTINCT b.id),
    COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)
  FROM bookings b
  LEFT JOIN payments p ON p.booking_id = b.id
  LEFT JOIN expenses e ON e.date BETWEEN p_start_date AND p_end_date
  WHERE b.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_financial_summary IS
  'Calcula el resumen financiero (ingresos, gastos, balance) en un rango de fechas';

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
