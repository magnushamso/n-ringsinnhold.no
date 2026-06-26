"use client";

import { useState, useEffect, useCallback } from "react";

// ── Typer ──────────────────────────────────────────────────────
interface MealItem {
  foodId: string;
  slug: string;
  name: string;
  grams: number;
  portionLabel: string;
  qty: number;
}

interface NutrientDef {
  id: string;
  label: string;
  unit: string;
  group: string;
  decimals: number;
}

// ── Næringsstoffer å vise ─────────────────────────────────────
const NUTRIENT_DEFS: NutrientDef[] = [
  // Energi
  { id: "Enerc_kcal", label: "Energi",        unit: "kcal", group: "Energi",           decimals: 0 },
  { id: "Enerc",      label: "Energi",         unit: "kJ",   group: "Energi",           decimals: 0 },
  // Makro
  { id: "Protein",    label: "Protein",         unit: "g",    group: "Makronæring",      decimals: 1 },
  { id: "Fett",       label: "Fett",            unit: "g",    group: "Makronæring",      decimals: 1 },
  { id: "Karbo",      label: "Karbohydrater",   unit: "g",    group: "Makronæring",      decimals: 1 },
  { id: "Sukker",     label: "Sukker",          unit: "g",    group: "Makronæring",      decimals: 1 },
  { id: "Fiber",      label: "Kostfiber",       unit: "g",    group: "Makronæring",      decimals: 1 },
  { id: "Vann",       label: "Vann",            unit: "g",    group: "Makronæring",      decimals: 1 },
  { id: "Alkohol",    label: "Alkohol",         unit: "g",    group: "Makronæring",      decimals: 1 },
  // Fettsyrer
  { id: "Mettet",     label: "Mettet fett",     unit: "g",    group: "Fettsyrer",        decimals: 2 },
  { id: "Enumet",     label: "Enumettet fett",  unit: "g",    group: "Fettsyrer",        decimals: 2 },
  { id: "Polyl",      label: "Flerumettet fett",unit: "g",    group: "Fettsyrer",        decimals: 2 },
  { id: "Omega-3",    label: "Omega-3",         unit: "g",    group: "Fettsyrer",        decimals: 2 },
  { id: "Omega-6",    label: "Omega-6",         unit: "g",    group: "Fettsyrer",        decimals: 2 },
  { id: "Trans",      label: "Transfett",       unit: "g",    group: "Fettsyrer",        decimals: 2 },
  { id: "Kolest",     label: "Kolesterol",      unit: "mg",   group: "Fettsyrer",        decimals: 0 },
  // Vitaminer
  { id: "Vit A",      label: "Vitamin A",       unit: "µg",   group: "Vitaminer",        decimals: 0 },
  { id: "Vit D",      label: "Vitamin D",       unit: "µg",   group: "Vitaminer",        decimals: 1 },
  { id: "Vit E",      label: "Vitamin E",       unit: "mg",   group: "Vitaminer",        decimals: 1 },
  { id: "VITK1",      label: "Vitamin K1",      unit: "µg",   group: "Vitaminer",        decimals: 1 },
  { id: "Vit B1",     label: "Tiamin (B1)",     unit: "mg",   group: "Vitaminer",        decimals: 2 },
  { id: "Vit B2",     label: "Riboflavin (B2)", unit: "mg",   group: "Vitaminer",        decimals: 2 },
  { id: "Niacin",     label: "Niacin (B3)",     unit: "mg",   group: "Vitaminer",        decimals: 1 },
  { id: "Vit B6",     label: "Vitamin B6",      unit: "mg",   group: "Vitaminer",        decimals: 2 },
  { id: "Folat",      label: "Folat",           unit: "µg",   group: "Vitaminer",        decimals: 0 },
  { id: "Vit B12",    label: "Vitamin B12",     unit: "µg",   group: "Vitaminer",        decimals: 1 },
  { id: "Vit C",      label: "Vitamin C",       unit: "mg",   group: "Vitaminer",        decimals: 1 },
  // Mineraler
  { id: "Ca",         label: "Kalsium",         unit: "mg",   group: "Mineraler",        decimals: 0 },
  { id: "Fe",         label: "Jern",            unit: "mg",   group: "Mineraler",        decimals: 1 },
  { id: "K",          label: "Kalium",          unit: "mg",   group: "Mineraler",        decimals: 0 },
  { id: "Mg",         label: "Magnesium",       unit: "mg",   group: "Mineraler",        decimals: 0 },
  { id: "Na",         label: "Natrium",         unit: "mg",   group: "Mineraler",        decimals: 0 },
  { id: "P",          label: "Fosfor",          unit: "mg",   group: "Mineraler",        decimals: 0 },
  { id: "Se",         label: "Selen",           unit: "µg",   group: "Mineraler",        decimals: 1 },
  { id: "Zn",         label: "Sink",            unit: "mg",   group: "Mineraler",        decimals: 1 },
  { id: "I",          label: "Jod",             unit: "µg",   group: "Mineraler",        decimals: 0 },
  { id: "Cu",         label: "Kobber",          unit: "mg",   group: "Mineraler",        decimals: 2 },
];

const GROUPS = [...new Set(NUTRIENT_DEFS.map(n => n.group))];
const DEFAULT_VISIBLE = new Set(["Enerc_kcal", "Protein", "Fett", "Karbo", "Fiber", "Sukker"]);

// ── Porsjoner ─────────────────────────────────────────────────
const PORTIONS = [
  { label: "gram",         factor: 1 },
  { label: "stk (60g)",   factor: 60 },
  { label: "stk (100g)",  factor: 100 },
  { label: "stk (150g)",  factor: 150 },
  { label: "dl",          factor: 100 },
  { label: "ss (15ml)",   factor: 15 },
  { label: "ts (5ml)",    factor: 5 },
  { label: "pakke (50g)", factor: 50 },
  { label: "pakke (100g)",factor: 100 },
  { label: "pakke (200g)",factor: 200 },
  { label: "pakke (400g)",factor: 400 },
  { label: "skive (20g)", factor: 20 },
  { label: "skive (30g)", factor: 30 },
  { label: "neve (30g)",  factor: 30 },
  { label: "kopp (240ml)",factor: 240 },
];

// ── Cookie-hjelp ──────────────────────────────────────────────
const COOKIE_KEY = "naeringsinnhold_meal";

function loadMeal(): MealItem[] {
  if (typeof document === "undefined") return [];
  try {
    const c = document.cookie.split("; ").find(r => r.startsWith(COOKIE_KEY + "="));
    if (c) return JSON.parse(decodeURIComponent(c.split("=")[1]));
  } catch {}
  return [];
}

function saveMeal(items: MealItem[]) {
  const val = encodeURIComponent(JSON.stringify(items));
  const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${val}; expires=${exp}; path=/; SameSite=Lax`;
  window.dispatchEvent(new Event("meal-updated"));
}

// ── Hoved-komponent ───────────────────────────────────────────
export default function MealPage() {
  const [items, setItems]           = useState<MealItem[]>([]);
  const [rawNutrients, setRaw]      = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading]       = useState(false);
  const [visible, setVisible]       = useState<Set<string>>(DEFAULT_VISIBLE);
  const [showPicker, setShowPicker] = useState(false);

  // Hent næringsstoffer for alle matvarer
  const fetchAll = useCallback(async (meal: MealItem[]) => {
    if (meal.length === 0) { setRaw({}); return; }
    setLoading(true);
    const results: Record<string, Record<string, number>> = {};
    await Promise.all(meal.map(async item => {
      try {
        const res = await fetch(`/api/naering/${item.slug}`);
        const data = await res.json();
        const n: Record<string, number> = {};
        for (const [k, v] of Object.entries(data.nutrients ?? {})) {
          n[k] = (v as any).value ?? 0;
        }
        results[item.foodId] = n;
      } catch {}
    }));
    setRaw(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    const meal = loadMeal();
    setItems(meal);
    fetchAll(meal);
    const handler = () => {
      const updated = loadMeal();
      setItems(updated);
      fetchAll(updated);
    };
    window.addEventListener("meal-updated", handler);
    return () => window.removeEventListener("meal-updated", handler);
  }, [fetchAll]);

  // Beregn skalert verdi for én matvare
  function getVal(foodId: string, nutId: string, grams: number): number {
    const n = rawNutrients[foodId];
    if (!n) return 0;
    return (n[nutId] ?? 0) * grams / 100;
  }

  // Summer alle matvarer for ett næringsstoff
  function getTotal(nutId: string): number {
    return items.reduce((sum, item) => sum + getVal(item.foodId, nutId, item.grams), 0);
  }

  function fmt(val: number, decimals: number): string {
    if (val === 0) return "0";
    return val.toFixed(decimals);
  }

  function updateItem(foodId: string, patch: Partial<MealItem>) {
    const updated = items.map(i => i.foodId === foodId ? { ...i, ...patch } : i);
    setItems(updated);
    saveMeal(updated);
  }

  function removeItem(foodId: string) {
    const updated = items.filter(i => i.foodId !== foodId);
    setItems(updated);
    saveMeal(updated);
    const n = { ...rawNutrients };
    delete n[foodId];
    setRaw(n);
  }

  function toggleNutrient(id: string) {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGroup(group: string, on: boolean) {
    setVisible(prev => {
      const next = new Set(prev);
      NUTRIENT_DEFS.filter(n => n.group === group).forEach(n => on ? next.add(n.id) : next.delete(n.id));
      return next;
    });
  }

  const visibleNutrients = NUTRIENT_DEFS.filter(n => visible.has(n.id));

  return (
    <main style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: ".75rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>🍽 Mitt måltid</h1>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button className="btn-toggle-nutrients" onClick={() => setShowPicker(p => !p)}>
            ⚙ Velg næringsstoffer
          </button>
          {items.length > 0 && (
            <button className="btn-clear-meal" onClick={() => { saveMeal([]); setItems([]); setRaw({}); }}>
              Tøm måltid
            </button>
          )}
        </div>
      </div>

      {/* Næringsstoff-velger */}
      {showPicker && (
        <div className="nutrient-picker">
          {GROUPS.map(group => {
            const groupNuts = NUTRIENT_DEFS.filter(n => n.group === group);
            const allOn = groupNuts.every(n => visible.has(n.id));
            return (
              <div key={group} className="nutrient-picker-group">
                <label className="picker-group-label">
                  <input type="checkbox" checked={allOn} onChange={e => toggleGroup(group, e.target.checked)} />
                  <strong>{group}</strong>
                </label>
                <div className="picker-items">
                  {groupNuts.map(n => (
                    <label key={n.id} className="picker-item">
                      <input type="checkbox" checked={visible.has(n.id)} onChange={() => toggleNutrient(n.id)} />
                      {n.label} <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>({n.unit})</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "1.1rem" }}>Ingen matvarer lagt til.</p>
          <p style={{ marginTop: ".5rem" }}>Søk øverst og klikk «+ Legg til måltid».</p>
        </div>
      ) : (
        <div className="meal-table-wrapper">
          <table className="meal-table">
            <thead>
              <tr>
                <th className="col-name">Matvare</th>
                <th className="col-qty">Mengde</th>
                {visibleNutrients.map(n => (
                  <th key={n.id} className="col-nut">{n.label}<br /><span style={{ fontWeight: 400, fontSize: ".75rem", color: "var(--text-muted)" }}>{n.unit}</span></th>
                ))}
                <th className="col-del"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.foodId}>
                  <td className="col-name">
                    <a href={`/matvare/${item.slug}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 500 }}>
                      {item.name}
                    </a>
                  </td>
                  <td className="col-qty">
                    <div style={{ display: "flex", gap: ".35rem", alignItems: "center" }}>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={item.qty}
                        onChange={e => {
                          const qty = parseFloat(e.target.value) || 1;
                          const portion = PORTIONS.find(p => p.label === item.portionLabel) ?? PORTIONS[0];
                          updateItem(item.foodId, { qty, grams: Math.round(qty * portion.factor) });
                        }}
                        className="meal-item-grams"
                        style={{ width: 55 }}
                      />
                      <select
                        value={item.portionLabel}
                        onChange={e => {
                          const portion = PORTIONS.find(p => p.label === e.target.value) ?? PORTIONS[0];
                          updateItem(item.foodId, { portionLabel: portion.label, grams: Math.round(item.qty * portion.factor) });
                        }}
                        className="add-portion"
                        style={{ fontSize: ".8rem" }}
                      >
                        {PORTIONS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                      <span style={{ fontSize: ".75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{item.grams}g</span>
                    </div>
                  </td>
                  {visibleNutrients.map(n => {
                    const val = getVal(item.foodId, n.id, item.grams);
                    return (
                      <td key={n.id} className="col-nut" style={{ color: val === 0 ? "var(--text-muted)" : "var(--text)" }}>
                        {loading ? "…" : fmt(val, n.decimals)}
                      </td>
                    );
                  })}
                  <td className="col-del">
                    <button onClick={() => removeItem(item.foodId)} className="meal-item-remove" title="Fjern">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totallinje */}
            <tfoot>
              <tr>
                <td className="col-name" style={{ fontWeight: 700 }}>Totalt</td>
                <td className="col-qty" style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
                  {items.reduce((s, i) => s + i.grams, 0)} g
                </td>
                {visibleNutrients.map(n => {
                  const total = getTotal(n.id);
                  return (
                    <td key={n.id} className="col-nut total-cell">
                      {loading ? "…" : fmt(total, n.decimals)}
                    </td>
                  );
                })}
                <td className="col-del"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
