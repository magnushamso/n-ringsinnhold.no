import { NextRequest, NextResponse } from "next/server";
import { getFoodBySlug } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const food = await getFoodBySlug(slug);
  if (!food) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ nutrients: food.nutrients }, {
    headers: { "Cache-Control": "public, s-maxage=86400" },
  });
}
