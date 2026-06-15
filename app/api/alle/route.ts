import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 86400;

export async function GET() {
  const foods = await db`
    SELECT id, slug, name_nb, food_group_id
    FROM foods
    ORDER BY name_nb
  `;

  return NextResponse.json({ foods }, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
