// app/api/sync/route.ts
// Kjøres via Vercel Cron Job eller manuelt: /api/sync?secret=DIN_SECRET
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

const BASE_URL = "https://www.matvaretabellen.no/api/nb";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const maxDuration = 300; // 5 min (krever Vercel Pro for >60s, se README)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 3 });

  try {
    // Matvaregrupper
    const groups = await fetch(`${BASE_URL}/food-groups.json`).then(r => r.json());
    const groupRows: any[] = [];
    function flatten(node: any, parentId: string | null = null) {
      groupRows.push({ id: node.id, parent_id: parentId, name_nb: node.name, name_en: node.nameEn ?? null });
      node.children?.forEach((c: any) => flatten(c, node.id));
    }
    (Array.isArray(groups) ? groups : [groups]).forEach((g: any) => flatten(g));
    for (const row of groupRows.filter(r => !r.parent_id)) {
      await db`INSERT INTO food_groups (id, parent_id, name_nb, name_en) VALUES (${row.id}, ${row.parent_id}, ${row.name_nb}, ${row.name_en}) ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb`;
    }
    for (const row of groupRows.filter(r => r.parent_id)) {
      await db`INSERT INTO food_groups (id, parent_id, name_nb, name_en) VALUES (${row.id}, ${row.parent_id}, ${row.name_nb}, ${row.name_en}) ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb`;
    }

    // Næringsstoffer
    const nutrients = await fetch(`${BASE_URL}/nutrients.json`).then(r => r.json());
    for (const n of nutrients) {
      await db`INSERT INTO nutrients (id, name_nb, name_en, unit, decimal_places) VALUES (${n.id}, ${n.name}, ${n.nameEn ?? null}, ${n.unit ?? null}, ${n.decimalPlaces ?? 1}) ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb`;
    }

    // Matvarer i bolker
    const foods = await fetch(`${BASE_URL}/foods.json`).then(r => r.json());
    const BATCH = 50;
    let count = 0;

    for (let i = 0; i < foods.length; i += BATCH) {
      const batch = foods.slice(i, i + BATCH);
      const foodRows = batch.map((f: any) => ({
        id: f.id,
        slug: `${slugify(f.name)}-${slugify(f.id)}`,
        name_nb: f.name,
        name_en: f.nameEn ?? null,
        food_group_id: f.foodGroupId ?? null,
        source: "matvaretabellen",
        source_id: f.id,
      }));
      await db`INSERT INTO foods ${db(foodRows)} ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb, updated_at = now()`;

      const nutRows: any[] = [];
      for (const food of batch) {
        for (const c of food.constituents ?? []) {
          nutRows.push({ food_id: food.id, nutrient_id: c.nutrientId, value: c.quantity ?? null });
        }
      }
      if (nutRows.length > 0) {
        await db`INSERT INTO food_nutrients ${db(nutRows)} ON CONFLICT (food_id, nutrient_id) DO UPDATE SET value = EXCLUDED.value`;
      }
      count += batch.length;
    }

    await db.end();
    return NextResponse.json({ ok: true, foods_synced: count });
  } catch (err: any) {
    await db.end();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
