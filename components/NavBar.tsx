"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface FoodEntry {
  id: string;
  slug: string;
  name_nb: string;
  food_group_id: string | null;
}

let cachedFoods: FoodEntry[] | null = null;
let cachePromise: Promise<FoodEntry[]> | null = null;

async function loadAllFoods(): Promise<FoodEntry[]> {
  if (cachedFoods) return cachedFoods;
  if (cachePromise) return cachePromise;
  cachePromise = fetch("/api/alle")
    .then(r => r.json())
    .then(data => { cachedFoods = data.foods ?? []; return cachedFoods!; });
  return cachePromise;
}

function searchLocal(foods: FoodEntry[], query: string, limit = 12): FoodEntry[] {
  const normalize = (s: string) => s.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a");
  const q = normalize(query.trim());
  const exact: FoodEntry[] = [], wordStart: FoodEntry[] = [], contains: FoodEntry[] = [];
  for (const f of foods) {
    const name = normalize(f.name_nb);
    if (name.startsWith(q)) exact.push(f);
    else if (name.includes(" " + q) || name.includes(", " + q)) wordStart.push(f);
    else if (name.includes(q)) contains.push(f);
  }
  return [...exact, ...wordStart, ...contains].slice(0, limit);
}

// ── Porsjonstyper ──────────────────────────────────────────────
const PORTIONS = [
  { label: "gram", factor: 1 },
  { label: "stk (ca. 60g)", factor: 60 },
  { label: "dl", factor: 100 },
  { label: "ss (15ml)", factor: 15 },
  { label: "ts (5ml)", factor: 5 },
  { label: "pakke (100g)", factor: 100 },
  { label: "pakke (200g)", factor: 200 },
  { label: "pakke (400g)", factor: 400 },
  { label: "skive (30g)", factor: 30 },
  { label: "neve (30g)", factor: 30 },
  { label: "kopp (240ml)", factor: 240 },
];

export interface MealItem {
  foodId: string;
  slug: string;
  name: string;
  grams: number;
  portionLabel: string;
  qty: number;
}

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

export default function NavBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Legg til-panel
  const [selected, setSelected] = useState<FoodEntry | null>(null);
  const [qty, setQty] = useState("100");
  const [portionIdx, setPortionIdx] = useState(0);
  const [added, setAdded] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAllFoods().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !cachedFoods) return;
    const q = query.trim();
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    const matches = searchLocal(cachedFoods, q);
    setResults(matches);
    setOpen(matches.length > 0);
  }, [query, ready]);

  function handleSelect(food: FoodEntry) {
    setSelected(food);
    setQty("100");
    setPortionIdx(0);
    setOpen(false);
    setQuery(food.name_nb);
    setAdded(false);
  }

  function handleNavigate() {
    if (!selected) return;
    setOpen(false);
    setQuery("");
    setSelected(null);
    router.push(`/matvare/${selected.slug}`);
  }

  function handleAdd() {
    if (!selected) return;
    const portion = PORTIONS[portionIdx];
    const grams = Math.round(parseFloat(qty) * portion.factor);
    const meal = loadMeal();
    const existing = meal.findIndex(m => m.foodId === selected.id && m.portionLabel === portion.label);
    if (existing >= 0) {
      meal[existing].qty += parseFloat(qty);
      meal[existing].grams += grams;
    } else {
      meal.push({ foodId: selected.id, slug: selected.slug, name: selected.name_nb, grams, portionLabel: portion.label, qty: parseFloat(qty) });
    }
    saveMeal(meal);
    setAdded(true);
    setTimeout(() => { setAdded(false); setQuery(""); setSelected(null); }, 1200);
  }

  return (
    <nav className="site-nav">
      <div className="inner">
        <a href="/" className="logo">Næringsinnhold.no</a>

        <div className="nav-search">
          <div className="search-wrapper" style={{ margin: 0, maxWidth: "420px" }}>
            <form onSubmit={e => { e.preventDefault(); if (selected) handleNavigate(); else if (results[0]) handleSelect(results[0]); }} role="search">
              <input
                ref={inputRef}
                type="search"
                placeholder={ready ? "Søk etter matvare…" : "Laster…"}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); setAdded(false); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onFocus={() => results.length > 0 && !selected && setOpen(true)}
                autoComplete="off"
                disabled={!ready}
                aria-label="Søk etter matvare"
              />
              <button type="submit">Søk</button>
            </form>

            {open && results.length > 0 && !selected && (
              <ul className="search-results" role="listbox">
                {results.map(r => (
                  <li key={r.id} role="option" onMouseDown={() => handleSelect(r)}>
                    <span className="result-name">{r.name_nb}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Legg til-panel */}
          {selected && !added && (
            <div className="add-panel">
              <span className="add-panel-name">{selected.name_nb}</span>
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="add-qty"
              />
              <select
                value={portionIdx}
                onChange={e => setPortionIdx(Number(e.target.value))}
                className="add-portion"
              >
                {PORTIONS.map((p, i) => (
                  <option key={p.label} value={i}>{p.label}</option>
                ))}
              </select>
              <button className="btn-add" onClick={handleAdd}>+ Legg til måltid</button>
              <button className="btn-view" onClick={handleNavigate}>Vis</button>
            </div>
          )}

          {added && <span className="add-confirm">✓ Lagt til!</span>}
        </div>

        <a href="/maltid" className="nav-meal-link">🍽 Måltid</a>
      </div>
    </nav>
  );
}
