import { getFoodGroups } from "@/lib/db";
import SearchBar from "@/components/SearchBar";
import FoodGroupGrid from "@/components/FoodGroupGrid";

export default async function HomePage() {
  const groups = await getFoodGroups();

  return (
    <main>
      <section className="hero">
        <h1>Næringsinnhold i norske matvarer</h1>
        <p>
          Søk blant over 1 800 matvarer fra den norske matvaretabellen.
          Finn kalorier, protein, karbohydrater, fett, vitaminer og mineraler.
        </p>
        <SearchBar />
      </section>

      <section className="groups">
        <h2>Utforsk kategorier</h2>
        <FoodGroupGrid groups={groups as any} />
      </section>
    </main>
  );
}
