"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface FoodEntry {
  id: string;
  slug: string;
  name_nb: string;
  food_group_id: string | null;
}

// Singleton — last kun én gang per økt
let cachedFoods: FoodEntry[] | null = null;
let cachePromise: Promise<FoodEntry[]> | null = null;

async function loadAllFoods(): Promise<FoodEntry[]> {
  if (cachedFoods) return cachedFoods;
  if (cachePromise) return cachePromise;

  cachePromise = fetch("/api/alle")
    .then(r => r.json())
    .then(data => {
      cachedFoods = data.foods ?? [];
      return cachedFoods!;
    });

  return cachePromise;
}

function searchLocal(foods: FoodEntry[], query: string, limit = 20): FoodEntry[] {
  const q = query.toLowerCase().trim()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a");

  const normalize = (s: string) => s.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a");

  const exact: FoodEntry[] = [];
  const wordStart: FoodEntry[] = [];
  const contains: FoodEntry[] = [];

  for (const f of foods) {
    const name = normalize(f.name_nb);
    if (name.startsWith(q)) exact.push(f);
    else if (name.includes(" " + q) || name.includes(", " + q)) wordStart.push(f);
    else if (name.includes(q)) contains.push(f);
  }

  return [...exact, ...wordStart, ...contains].slice(0, limit);
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Last alle matvarer i bakgrunnen ved mount
  useEffect(() => {
    loadAllFoods().then(() => setReady(true));
  }, []);

  // Søk lokalt — instant, ingen nettverksforespørsel
  useEffect(() => {
    if (!ready || !cachedFoods) return;
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const matches = searchLocal(cachedFoods, q);
    setResults(matches);
    setOpen(matches.length > 0);
  }, [query, ready]);

  function handleSelect(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/matvare/${slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results.length > 0) handleSelect(results[0].slug);
  }

  return (
    <div className="search-wrapper">
      <form onSubmit={handleSubmit} role="search">
        <input
          ref={inputRef}
          type="search"
          placeholder={ready ? 'Søk, f.eks. "egg", "laks", "havregryn"…' : "Laster matvarer…"}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
          aria-label="Søk etter matvare"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={!ready}
        />
        <button type="submit" aria-label="Søk">Søk</button>
      </form>

      {open && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map(r => (
            <li key={r.id} role="option" onMouseDown={() => handleSelect(r.slug)}>
              <span className="result-name">{r.name_nb}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
