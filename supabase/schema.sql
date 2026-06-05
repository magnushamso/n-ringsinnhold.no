-- ============================================================
-- næringsinnhold.no — Neon (Postgres) database schema
-- ============================================================
-- Kjør i Neon Dashboard > SQL Editor
-- ============================================================

-- Aktiver nødvendige extensions
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- MATVAREKATEGORIER (hierarkisk)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_groups (
  id          TEXT PRIMARY KEY,
  parent_id   TEXT REFERENCES food_groups(id),
  name_nb     TEXT NOT NULL,
  name_en     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NÆRINGSSTOFFER (definisjonstabell)
-- ============================================================
CREATE TABLE IF NOT EXISTS nutrients (
  id              TEXT PRIMARY KEY,
  name_nb         TEXT NOT NULL,
  name_en         TEXT,
  eurofir_id      TEXT,
  unit            TEXT,
  decimal_places  INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MATVARER
-- ============================================================
CREATE TABLE IF NOT EXISTS foods (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  name_nb         TEXT NOT NULL,
  name_en         TEXT,
  food_group_id   TEXT REFERENCES food_groups(id),
  latin_name      TEXT,
  source          TEXT DEFAULT 'matvaretabellen',
  source_id       TEXT,
  barcode         TEXT,
  brand           TEXT,
  image_url       TEXT,
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NÆRINGSVERDIER (per 100g spiselig del)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_nutrients (
  id           BIGSERIAL PRIMARY KEY,
  food_id      TEXT NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  nutrient_id  TEXT NOT NULL REFERENCES nutrients(id),
  value        NUMERIC,
  source_note  TEXT,
  UNIQUE(food_id, nutrient_id)
);

-- ============================================================
-- LANGUAL-KODER
-- ============================================================
CREATE TABLE IF NOT EXISTS langual_codes (
  code         TEXT PRIMARY KEY,
  description  TEXT
);

CREATE TABLE IF NOT EXISTS food_langual (
  food_id      TEXT NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  langual_code TEXT NOT NULL REFERENCES langual_codes(code),
  PRIMARY KEY (food_id, langual_code)
);

-- ============================================================
-- SYNC-LOGG
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  foods_added   INT DEFAULT 0,
  foods_updated INT DEFAULT 0,
  status        TEXT DEFAULT 'running',
  error_msg     TEXT
);

-- ============================================================
-- INDEKSER
-- ============================================================
CREATE INDEX IF NOT EXISTS foods_name_nb_trgm ON foods USING GIN (name_nb gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_name_en_trgm ON foods USING GIN (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS foods_slug_idx ON foods (slug);
CREATE INDEX IF NOT EXISTS foods_barcode_idx ON foods (barcode);
CREATE INDEX IF NOT EXISTS food_nutrients_food_id_idx ON food_nutrients (food_id);

-- Full-tekst søkevektor
ALTER TABLE foods ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('norwegian', coalesce(name_nb, '')) ||
    to_tsvector('english',   coalesce(name_en, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS foods_search_vector_idx ON foods USING GIN (search_vector);
