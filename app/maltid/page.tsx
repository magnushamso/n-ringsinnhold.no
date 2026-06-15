"use client";

import { useState, useEffect } from "react";
import type { MealItem } from "@/components/NavBar";

const COOKIE_KEY = "naeringsinnhold_meal";

function loadMeal(): MealItem[] {
  try {
    const c = document.cookie.split("; ").find(r => r.startsWith(COOKIE_KEY + "="));
    if (c) return JSON.parse(decodeURIComponent(c.split("=")[1]));
  } catch {}
  return [];
}

function saveMeal(items: MealItem[]) {
  const val = encodeURIComponent(JSON.stringify(items));
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${val}; expires=${expires}; path=/; SameSite=Lax`;
  window.dispatchEvent(new Event("meal-updated"));
}

interface NutrientSummary {
  kcal: number; protein: number; fett: number; karbo: number; fiber: number;
}

export default function MealPage() {
  const [items, setItems] = useState<MealItem[]>([]);
  const [nutrients, setNutrients] = useState<Record<string, NutrientSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const meal = loadMeal();
    setItems(meal);
    if (meal.length > 0) fetchNutrients(meal);
    else setLoading(false);

    const handler = () => {
      const updated = loadMeal();
      setItems(updated);
      if (updated.length > 0) fetchNutrients(updated);
    };
    window.addEventListener("meal-updated", handler);
    return () => window.removeEventListener("meal-updated", handler);
  }, []);

  async function fetchNutrients(meal: MealItem[]) {
    setLoading(true);
    const results: Record<string, NutrientSummary> = {};
    await Promise.all(meal.map(async item => {
      try {
        const res = await fetch(`/api/naering/${item.slug}`);
        const data = await res.json();
        const n = data.nutrients ?? {};
        const factor = item.grams / 100;
        results[item.foodId] = {
          kcal:    Math.round((n["Enerc_kcal"]?.value ?? 0) * factor),
          protein: Math.round((n["Protein"]?.value ?? 0) * factor * 10) / 10,
          fett:    Math.round((n["Fett"]?.value ?? 0) * factor * 10) / 10,
          karbo:   Math.round((n["Karbo"]?.value ?? 0) * factor * 10) / 10,
          fiber:   Math.round((n["Fiber"]?.value ?? 0) * factor * 10) / 10,
        };
      } catch {}
    }));
    setNutrients(results);
    setLoading(false);
  }

  function remove(foodId: string) {
    const updated = items.filter(i => i.foodId !== foodId);
    setItems(updated);
    saveMeal(updated);
    const n = { ...nutrients };
    delete n[foodId];
    setNutrients(n);
  }

  function updateGrams(foodId: string, grams: number) {
    const updated = items.map(i => i.foodId === foodId ? { ...i, grams } : i);
    setItems(updated);
    saveMeal(updated);
    fetchNutrients(updated);
  }

  const total = Object.values(nutrients).reduce(
    (acc, n) => ({ kcal: acc.kcal + n.kcal, protein: acc.protein + n.protein, fett: acc.fett + n.fett, karbo: acc.karbo + n.karbo, fiber: acc.fiber + n.fiber }),
    { kcal: 0, protein: 0, fett: 0, karbo: 0, fiber: 0 }
  );

  return (
    <main>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem" }}>🍽 Mitt måltid</h1>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "1.1rem" }}>Ingen matvarer lagt til ennå.</p>
          <p style={{ marginTop: ".5rem" }}>Bruk søkefeltet øverst for å legge til matvarer.</p>
        </div>
      ) : (
        <>
          {/* Totaloversikt */}
          <div className="macro-grid" style={{ marginBottom: "2rem" }}>
            {[
              { label: "Kalorier", value: total.kcal, unit: "kcal" },
              { label: "Protein",  value: total.protein, unit: "g" },
              { label: "Karbohydrater", value: total.karbo, unit: "g" },
              { label: "Fett",     value: total.fett, unit: "g" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="macro-card">
                <span className="macro-label">{label}</span>
                <span className="macro-value">{loading ? "…" : value}</span>
                <span className="macro-unit">{unit}</span>
              </div>
            ))}
          </div>

          {/* Matvarer */}
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", marginBottom: "2rem" }}>
            {items.map(item => {
              const n = nutrients[item.foodId];
              return (
                <div key={item.foodId} className="meal-item-card">
                  <div className="meal-item-header">
                    <a href={`/matvare/${item.slug}`} className="meal-item-name">{item.name}</a>
                    <button className="meal-item-remove" onClick={() => remove(item.foodId)} aria-label="Fjern">✕</button>
                  </div>
                  <div className="meal-item-controls">
                    <input
                      type="number"
                      min="1"
                      value={item.grams}
                      onChange={e => updateGrams(item.foodId, Number(e.target.value))}
                      className="meal-item-grams"
                    />
                    <span style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>gram</span>
                  </div>
                  {n && (
                    <div className="meal-item-macros">
                      <span>{n.kcal} kcal</span>
                      <span>P: {n.protein}g</span>
                      <span>K: {n.karbo}g</span>
                      <span>F: {n.fett}g</span>
                      {n.fiber > 0 && <span>Fiber: {n.fiber}g</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { saveMeal([]); setItems([]); setNutrients({}); }}
            style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: ".9rem", textDecoration: "underline" }}
          >
            Tøm måltid
          </button>
        </>
      )}
    </main>
  );
}
