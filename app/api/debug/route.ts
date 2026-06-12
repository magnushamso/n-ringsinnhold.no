import { NextResponse } from "next/server";

export async function GET() {
  const foodsRaw = await fetch("https://www.matvaretabellen.no/api/nb/foods.json").then(r => r.json());
  const nutrientsRaw = await fetch("https://www.matvaretabellen.no/api/nb/nutrients.json").then(r => r.json());
  const groupsRaw = await fetch("https://www.matvaretabellen.no/api/nb/food-groups.json").then(r => r.json());

  function describe(data: any) {
    if (Array.isArray(data)) {
      return { type: "array", length: data.length, first: data[0] };
    }
    if (data && typeof data === "object") {
      return {
        type: "object",
        keys: Object.keys(data),
        firstKeySample: Object.entries(data).slice(0, 1),
      };
    }
    return { type: typeof data, value: data };
  }

  return NextResponse.json({
    foods: describe(foodsRaw),
    nutrients: describe(nutrientsRaw),
    groups: describe(groupsRaw),
  });
}
