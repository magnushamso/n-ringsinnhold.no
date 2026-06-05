import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFoodBySlug } from "@/lib/db";
import NutrientTable from "@/components/NutrientTable";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const food = await getFoodBySlug(slug);
  if (!food) return { title: "Matvare ikke funnet" };
  return {
    title: `Næringsinnhold i ${food.name_nb}`,
    description: `Kalorier, protein, karbohydrater og fett i ${food.name_nb}. Alle næringsverdier per 100g.`,
  };
}

export default async function FoodPage({ params }: Props) {
  const { slug } = await params;
  const food = await getFoodBySlug(slug);
  if (!food) notFound();

  const kcal  = food.nutrients?.["Enerc_kcal"]?.value;
  const prot  = food.nutrients?.["Prot"]?.value;
  const fat   = food.nutrients?.["Fat"]?.value;
  const carbs = food.nutrients?.["Choavldf"]?.value;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NutritionInformation",
    name: food.name_nb,
    servingSize: "100 g",
    calories: kcal ? `${kcal} kcal` : undefined,
    proteinContent: prot ? `${prot} g` : undefined,
    fatContent: fat ? `${fat} g` : undefined,
    carbohydrateContent: carbs ? `${carbs} g` : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <nav className="breadcrumb">
          <a href="/">Forsiden</a>
          {food.food_group_name && (
            <>
              <span>/</span>
              <a href={`/kategori/${food.food_group_id}`}>{food.food_group_name}</a>
            </>
          )}
          <span>/</span>
          <span>{food.name_nb}</span>
        </nav>

        <article className="food-detail">
          <header>
            <h1>{food.name_nb}</h1>
            {food.name_en && <p className="name-en">{food.name_en}</p>}
          </header>

          <div className="macro-grid">
            {[
              { label: "Kalorier", value: kcal, unit: "kcal" },
              { label: "Protein",  value: prot,  unit: "g" },
              { label: "Karbohydrater", value: carbs, unit: "g" },
              { label: "Fett",     value: fat,   unit: "g" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="macro-card">
                <span className="macro-label">{label}</span>
                <span className="macro-value">{value != null ? Number(value).toFixed(1) : "—"}</span>
                <span className="macro-unit">{unit}</span>
              </div>
            ))}
          </div>

          <NutrientTable nutrients={food.nutrients} />

          <footer className="food-source">
            <p>
              Kilde:{" "}
              <a href="https://www.matvaretabellen.no" target="_blank" rel="noopener noreferrer">
                Matvaretabellen
              </a>{" "}
              (Mattilsynet / UiO). Verdier per 100 g spiselig del.
            </p>
          </footer>
        </article>
      </main>
    </>
  );
}
