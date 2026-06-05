import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFoodsByGroup } from "@/lib/db";
import { db } from "@/lib/db";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [group] = await db`SELECT name_nb FROM food_groups WHERE id = ${params.id} LIMIT 1`;
  if (!group) return { title: "Kategori ikke funnet" };
  return { title: group.name_nb as string };
}

export default async function CategoryPage({ params }: Props) {
  const [group] = await db`SELECT name_nb FROM food_groups WHERE id = ${params.id} LIMIT 1`;
  if (!group) notFound();

  const foods = await getFoodsByGroup(params.id, 200);

  return (
    <main>
      <nav className="breadcrumb">
        <a href="/">Forsiden</a>
        <span>/</span>
        <span>{group.name_nb as string}</span>
      </nav>

      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        {group.name_nb as string}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
        {foods.map((f) => (
          <a
            key={f.id}
            href={`/matvare/${f.slug}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: ".75rem 1rem",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e8e3dc",
              textDecoration: "none",
              color: "#1a1a18",
              fontWeight: 500,
            }}
          >
            {f.name_nb}
          </a>
        ))}
      </div>
    </main>
  );
}
