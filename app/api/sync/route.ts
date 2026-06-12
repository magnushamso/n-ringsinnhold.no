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

function n(val: any): any {
  return val === undefined ? null : val;
}

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val;
    }
  }
  return [];
}

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pagination: ?offset=0&limit=300
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "300");

  const db = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 3 });

  try {
    // Kjør grupper/næringsstoffer kun på første kall (offset=0)
    if (offset === 0) {
      const groups = await fetch(`${BASE_URL}/food-groups.json`).then(r => r.json());
      const groupRows: any[] = [];
      function flatten(node: any, parentId: string | null = null) {
        if (node.id != null) {
          groupRows.push({ id: n(node.id), parent_id: n(parentId), name_nb: n(node.name) ?? "", name_en: n(node.nameEn) });
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

      const nutrients = asArray(await fetch(`${BASE_URL}/nutrients.json`).then(r => r.json()));
      const nutRows = nutrients
        .map((nut: any) => ({
          id: n(nut.id ?? nut.nutrientId ?? nut.code),
          name_nb: n(nut.name ?? nut.nutrientName) ?? "",
          name_en: n(nut.nameEn),
          unit: n(nut.unit),
          decimal_places: n(nut.decimalPlaces) ?? 1,
        }))
        .filter((r: any) => r.id != null);

      if (nutRows.length > 0) {
        await db`
          INSERT INTO nutrients ${db(nutRows)}
          ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb
        `;
      }
    }

    // Matvarer (med paginering)
    const allFoods = asArray(await fetch(`${BASE_URL}/foods.json`).then(r => r.json()));
    const total = allFoods.length;
    const batch = allFoods.slice(offset, offset + limit);

    const foodRows: any[] = [];
    const nutRows: any[] = [];

    for (const f of batch) {
      const foodId = n(f.id ?? f.foodId);
      const foodName = n(f.name ?? f.foodName) ?? "";
      if (foodId == null) continue;

      foodRows.push({
        id: foodId,
        slug: `${slugify(foodName)}-${slugify(foodId)}`,
        name_nb: foodName,
        name_en: n(f.nameEn),
        food_group_id: n(f.foodGroupId),
        source: "matvaretabellen",
        source_id: foodId,
      });

      for (const c of f.constituents ?? []) {
        if (!c.nutrientId) continue;
        nutRows.push({ food_id: foodId, nutrient_id: n(c.nutrientId), value: n(c.quantity) });
      }
    }

    if (foodRows.length > 0) {
      await db`
        INSERT INTO foods ${db(foodRows)}
        ON CONFLICT (id) DO UPDATE SET name_nb = EXCLUDED.name_nb, updated_at = now()
      `;
    }

    // Insert næringsverdier i sub-batches (store mengder)
    const SUB_BATCH = 500;
    for (let i = 0; i < nutRows.length; i += SUB_BATCH) {
      const chunk = nutRows.slice(i, i + SUB_BATCH);
      if (chunk.length > 0) {
        await db`
          INSERT INTO food_nutrients ${db(chunk)}
          ON CONFLICT (food_id, nutrient_id) DO UPDATE SET value = EXCLUDED.value
        `;
      }
    }

    await db.end();

    const nextOffset = offset + limit;
    const done = nextOffset >= total;

    return NextResponse.json({
      ok: true,
      processed: batch.length,
      offset,
      total,
      done,
      next: done ? null : `/api/sync?secret=${secret}&offset=${nextOffset}&limit=${limit}`,
    });

  } catch (err: any) {
    await db.end();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
