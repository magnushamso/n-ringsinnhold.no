import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

const BASE_URL = "https://www.matvaretabellen.no/api/nb";

function slugify(text: string) {
  return (text ?? "ukjent")
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ukjent";
}

// Konverter alle undefined til null (postgres.js godtar ikke undefined)
function n(val: any): any {
  return val === undefined ? null : val;
}

// Hent ut array fra respons, uansett om den er direkte array eller {key: [...]}
function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    max: 3,
    types: {
      // Returner null for undefined automatisk
    },
  });

  try {
    // 1. Matvaregrupper
    const groups = await fetch(`${BASE_URL}/food-groups.json`).then(r => r.json());
    const groupRows: any[] = [];
    function flatten(node: any, parentId: string | null = null) {
      if (node.id != null) {
        groupRows.push({
          id: n(node.id),
          parent_id: n(parentId),
          name_nb: n(node.name) ?? "",
          name_en: n(node.nameEn),
        });
      }
      node.children?.forEach((c: any) => flatten(c, node.id ?? parentId));
    }
    (Array.isArray(groups) ? groups : [groups]).forEach((g: any) => flatten(g));

    for (const row of groupRows.filter(r => !r.parent_id)) {
      await db`INSERT INTO food_groups (id, parent_id, name_nb, name_en) VALUES (${row.id}, ${row.parent_id}, ${row.name_nb}, ${row.name_en}) ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb`;
    }
    for (const row of groupRows.filter(r => r.parent_id)) {
      await db`INSERT INTO food_groups (id, parent_id, name_nb, name_en) VALUES (${row.id}, ${row.parent_id}, ${row.name_nb}, ${row.name_en}) ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb`;
    }

    // 2. Næringsstoffer
    const nutrients = asArray(await fetch(`${BASE_URL}/nutrients.json`).then(r => r.json()));
    for (const nut of nutrients) {
      const nutId = n(nut.id ?? nut.nutrientId ?? nut.code);
      if (nutId == null) continue;
      await db`
        INSERT INTO nutrients (id, name_nb, name_en, unit, decimal_places)
        VALUES (${nutId}, ${n(nut.name ?? nut.nutrientName) ?? ""}, ${n(nut.nameEn)}, ${n(nut.unit)}, ${n(nut.decimalPlaces) ?? 1})
        ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb
      `;
    }

    // 3. Matvarer
    const foods = asArray(await fetch(`${BASE_URL}/foods.json`).then(r => r.json()));
    let count = 0;

    for (const f of foods) {
      const foodId = n(f.id ?? f.foodId);
      const foodName = n(f.name ?? f.foodName) ?? "";
      if (foodId == null) continue;
      const slug = `${slugify(foodName)}-${slugify(foodId)}`;

      await db`
        INSERT INTO foods (id, slug, name_nb, name_en, food_group_id, source, source_id)
        VALUES (
          ${foodId},
          ${slug},
          ${foodName},
          ${n(f.nameEn)},
          ${n(f.foodGroupId)},
          ${"matvaretabellen"},
          ${foodId}
        )
        ON CONFLICT (id) DO UPDATE SET
          name_nb = EXCLUDED.name_nb,
          updated_at = now()
      `;

      for (const c of f.constituents ?? []) {
        if (!c.nutrientId) continue;
        await db`
          INSERT INTO food_nutrients (food_id, nutrient_id, value)
          VALUES (${foodId}, ${n(c.nutrientId)}, ${n(c.quantity)})
          ON CONFLICT (food_id, nutrient_id) DO UPDATE SET value = EXCLUDED.value
        `;
      }

      count++;
    }

    await db.end();
    return NextResponse.json({ ok: true, foods_synced: count });

  } catch (err: any) {
    await db.end();
    return NextResponse.json({ error: err.message, stack: err.stack?.split('\n').slice(0,5) }, { status: 500 });
  }
}
