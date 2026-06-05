"use client";
// components/SearchBar.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Result {
  id: string;
  slug: string;
  name_nb: string;
  food_group_name: string | null;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sok?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

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
          type="search"
          placeholder="Søk etter matvare, f.eks. «egg», «laks», «havregryn»…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
          aria-label="Søk etter matvare"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        <button type="submit" disabled={loading} aria-label="Søk">
          {loading ? "…" : "Søk"}
        </button>
      </form>

      {open && results.length > 0 && (
        <ul className="search-results" role="listbox">
          {results.map((r) => (
            <li
              key={r.id}
              role="option"
              onMouseDown={() => handleSelect(r.slug)}
            >
              <span className="result-name">{r.name_nb}</span>
              {r.food_group_name && (
                <span className="result-group">{r.food_group_name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
