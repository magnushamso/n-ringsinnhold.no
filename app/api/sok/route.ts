import { NextRequest, NextResponse } from "next/server";
import { searchFoods } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  const results = await searchFoods(q, 20);
  return NextResponse.json({ results }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
