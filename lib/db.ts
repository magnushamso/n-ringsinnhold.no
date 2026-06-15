// lib/db.ts
// Postgres-klient for Neon (postgres.js)

import postgres from "postgres";

// Singleton — gjenbruk connection i Next.js dev-modus
const globalForDb = globalThis as unknown as { db: postgres.Sql };

export const db =
  globalForDb.db ??
  postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 10,           // maks 10 connections (Neon free tier)
    idle_timeout: 20,  // lukk idle connections etter 20s (viktig for Neon)
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// ── Typer ──────────────────────────────────────────────────────

export interface Food {
  id: string;
  slug: string;
  name_nb: string;
  name_en: string | null;
  food_group_id: string | null;
  food_group_name: string | null;
  source: string;
  barcode: string | null;
  brand: string | null;
}

export interface FoodWithNutrients extends Food {
  nutrients: Record<
    string,
    { value: number | null; unit: string; name: string }
  >;
}

// ── Søk ────────────────────────────────────────────────────────

export async function searchFoods(query: string, limit = 20): Promise<Food[]> {
  if (!query || query.trim().length < 1) return [];

  const q = query.trim();

  const results = await db`
    SELECT
      f.id, f.slug, f.name_nb, f.name_en,
      f.food_group_id, fg.name_nb AS food_group_name,
      f.source, f.barcode, f.brand
    FROM foods f
    LEFT JOIN food_groups fg ON fg.id = f.food_group_id
    WHERE f.name_nb ILIKE ${q + '%'}
       OR f.name_nb ILIKE ${'% ' + q + '%'}
       OR f.name_nb ILIKE ${'%' + q + '%'}
    ORDER BY
      CASE
        WHEN f.name_nb ILIKE ${q + '%'} THEN 0
        WHEN f.name_nb ILIKE ${'% ' + q + '%'} THEN 1
        ELSE 2
      END,
      f.name_nb
    LIMIT ${limit}
  `;

  return results as unknown as Food[];
}

// ── Hent enkelt matvare med alle næringsverdier ────────────────

export async function getFoodBySlug(slug: string): Promise<FoodWithNutrients | null> {
  const rows = await db`
    SELECT
      f.id, f.slug, f.name_nb, f.name_en,
      f.food_group_id, fg.name_nb AS food_group_name,
      f.source, f.barcode, f.brand,
      jsonb_object_agg(
        fn.nutrient_id,
        jsonb_build_object(
          'value', fn.value,
          'unit',  n.unit,
          'name',  n.name_nb
        )
      ) FILTER (WHERE fn.nutrient_id IS NOT NULL) AS nutrients
    FROM foods f
    LEFT JOIN food_groups fg ON fg.id = f.food_group_id
    LEFT JOIN food_nutrients fn ON fn.food_id = f.id
    LEFT JOIN nutrients n ON n.id = fn.nutrient_id
    WHERE f.slug = ${slug}
    GROUP BY f.id, f.slug, f.name_nb, f.name_en,
             f.food_group_id, fg.name_nb, f.source, f.barcode, f.brand
    LIMIT 1
  `;

  return rows[0] as unknown as FoodWithNutrients ?? null;
}

// ── Hent matvarer per kategori ─────────────────────────────────

export async function getFoodsByGroup(groupId: string, limit = 50): Promise<Food[]> {
  const results = await db`
    SELECT
      f.id, f.slug, f.name_nb, f.name_en,
      f.food_group_id, fg.name_nb AS food_group_name,
      f.source, f.barcode, f.brand
    FROM foods f
    LEFT JOIN food_groups fg ON fg.id = f.food_group_id
    WHERE f.food_group_id = ${groupId}
    ORDER BY f.name_nb
    LIMIT ${limit}
  `;
  return results as unknown as Food[];
}

// ── Hent alle matvaregrupper (toppnivå) ───────────────────────

export async function getFoodGroups() {
  const results = await db`
    SELECT id, name_nb, name_en, parent_id
    FROM food_groups
    WHERE parent_id IS NULL
    ORDER BY name_nb
  `;
  return results;
}
