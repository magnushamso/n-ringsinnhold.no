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
  rdi?: number; // Anbefalt daglig inntak
}

// ── Anbefalte daglige inntak (Nordic Nutrition Recommendations 2023) ──
const NUTRIENT_DEFS: NutrientDef[] = [
  { id: "Enerc_kcal", label: "Energi",           unit: "kcal", group: "Energi",      decimals: 0, rdi: 2000 },
  { id: "Enerc",      label: "Energi (kJ)",       unit: "kJ",   group: "Energi",      decimals: 0, rdi: 8400 },
  { id: "Protein",    label: "Protein",            unit: "g",    group: "Makronæring", decimals: 1, rdi: 55 },
  { id: "Fett",       label: "Fett",               unit: "g",    group: "Makronæring", decimals: 1, rdi: 70 },
  { id: "Karbo",      label: "Karbohydrater",      unit: "g",    group: "Makronæring", decimals: 1, rdi: 260 },
  { id: "Sukker",     label: "Sukker",             unit: "g",    group: "Makronæring", decimals: 1, rdi: 50 },
  { id: "Fiber",      label: "Kostfiber",          unit: "g",    group: "Makronæring", decimals: 1, rdi: 30 },
  { id: "Vann",       label: "Vann",               unit: "g",    group: "Makronæring", decimals: 1 },
  { id: "Alkohol",    label: "Alkohol",            unit: "g",    group: "Makronæring", decimals: 1 },
  { id: "Mettet",     label: "Mettet fett",        unit: "g",    group: "Fettsyrer",   decimals: 2, rdi: 24 },
  { id: "Enumet",     label: "Enumettet",          unit: "g",    group: "Fettsyrer",   decimals: 2 },
  { id: "Polyl",      label: "Flerumettet",        unit: "g",    group: "Fettsyrer",   decimals: 2 },
  { id: "Omega-3",    label: "Omega-3",            unit: "g",    group: "Fettsyrer",   decimals: 2, rdi: 2 },
  { id: "Omega-6",    label: "Omega-6",            unit: "g",    group: "Fettsyrer",   decimals: 2 },
  { id: "Trans",      label: "Transfett",          unit: "g",    group: "Fettsyrer",   decimals: 2 },
  { id: "Kolest",     label: "Kolesterol",         unit: "mg",   group: "Fettsyrer",   decimals: 0, rdi: 300 },
  { id: "Vit A",      label: "Vitamin A",          unit: "µg",   group: "Vitaminer",   decimals: 0, rdi: 800 },
  { id: "Vit D",      label: "Vitamin D",          unit: "µg",   group: "Vitaminer",   decimals: 1, rdi: 10 },
  { id: "Vit E",      label: "Vitamin E",          unit: "mg",   group: "Vitaminer",   decimals: 1, rdi: 12 },
  { id: "VITK1",      label: "Vitamin K",          unit: "µg",   group: "Vitaminer",   decimals: 1, rdi: 75 },
  { id: "Vit B1",     label: "Tiamin (B1)",        unit: "mg",   group: "Vitaminer",   decimals: 2, rdi: 1.1 },
  { id: "Vit B2",     label: "Riboflavin (B2)",    unit: "mg",   group: "Vitaminer",   decimals: 2, rdi: 1.4 },
  { id: "Niacin",     label: "Niacin (B3)",        unit: "mg",   group: "Vitaminer",   decimals: 1, rdi: 16 },
  { id: "Vit B6",     label: "Vitamin B6",         unit: "mg",   group: "Vitaminer",   decimals: 2, rdi: 1.4 },
  { id: "Folat",      label: "Folat",              unit: "µg",   group: "Vitaminer",   decimals: 0, rdi: 300 },
  { id: "Vit B12",    label: "Vitamin B12",        unit: "µg",   group: "Vitaminer",   decimals: 1, rdi: 2.4 },
  { id: "Vit C",      label: "Vitamin C",          unit: "mg",   group: "Vitaminer",   decimals: 1, rdi: 80 },
  { id: "Ca",         label: "Kalsium",            unit: "mg",   group: "Mineraler",   decimals: 0, rdi: 800 },
  { id: "Fe",         label: "Jern",               unit: "mg",   group: "Mineraler",   decimals: 1, rdi: 14 },
  { id: "K",          label: "Kalium",             unit: "mg",   group: "Mineraler",   decimals: 0, rdi: 3500 },
  { id: "Mg",         label: "Magnesium",          unit: "mg",   group: "Mineraler",   decimals: 0, rdi: 375 },
  { id: "Na",         label: "Natrium",            unit: "mg",   group: "Mineraler",   decimals: 0, rdi: 2000 },
  { id: "P",          label: "Fosfor",             unit: "mg",   group: "Mineraler",   decimals: 0, rdi: 700 },
  { id: "Se",         label: "Selen",              unit: "µg",   group: "Mineraler",   decimals: 1, rdi: 55 },
  { id: "Zn",         label: "Sink",               unit: "mg",   group: "Mineraler",   decimals: 1, rdi: 10 },
  { id: "I",          label: "Jod",                unit: "µg",   group: "Mineraler",   decimals: 0, rdi: 150 },
  { id: "Cu",         label: "Kobber",             unit: "mg",   group: "Mineraler",   decimals: 2, rdi: 1 },
];

const GROUPS = [...new Set(NUTRIENT_DEFS.map(n => n.group))];
const ALL_IDS = NUTRIENT_DEFS.map(n => n.id);
const DEFAULT_VISIBLE = ["Enerc_kcal", "Protein", "Fett", "Karbo", "Fiber", "Sukker"];

const PORTIONS = [
  { label: "gram",          factor: 1 },
  { label: "stk (60g)",    factor: 60 },
  { label: "stk (100g)",   factor: 100 },
  { label: "stk (150g)",   factor: 150 },
  { label: "dl",           factor: 100 },
  { label: "ss (15ml)",    factor: 15 },
  { label: "ts (5ml)",     factor: 5 },
  { label: "pakke (50g)",  factor: 50 },
  { label: "pakke (100g)", factor: 100 },
  { label: "pakke (200g)", factor: 200 },
  { label: "pakke (400g)", factor: 400 },
  { label: "skive (20g)",  factor: 20 },
  { label: "skive (30g)",  factor: 30 },
  { label: "neve (30g)",   factor: 30 },
  { label: "kopp (240ml)", factor: 240 },
];

const MEAL_COOKIE = "naeringsinnhold_meal";
const PREFS_KEY   = "naeringsinnhold_prefs";

function loadMeal(): MealItem[] {
  if (typeof document === "undefined") return [];
  try {
    const c = document.cookie.split("; ").find(r => r.startsWith(MEAL_COOKIE + "="));
    if (c) return JSON.parse(decodeURIComponent(c.split("=")[1]));
  } catch {}
  return [];
}

function saveMeal(items: MealItem[]) {
  const val = encodeURIComponent(JSON.stringify(items));
  const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${MEAL_COOKIE}=${val}; expires=${exp}; path=/; SameSite=Lax`;
  window.dispatchEvent(new Event("meal-updated"));
}

function loadPrefs(): string[] {
  try { const r = localStorage.getItem(PREFS_KEY); if (r) return JSON.parse(r); } catch {}
  return DEFAULT_VISIBLE;
}

function savePrefs(ids: string[]) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(ids)); } catch {}
}

// ── RDI-stolpe ────────────────────────────────────────────────
function RdiBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct >= 100 ? "#e76f51" : pct >= 66 ? "#f4a261" : "var(--green)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".4rem", minWidth: 90 }}>
      <div style={{ flex: 1, background: "#e8e3dc", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${capped}%`, background: color, height: "100%", borderRadius: 4, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: ".75rem", color: pct >= 100 ? "#e76f51" : "var(--text-muted)", fontWeight: 600, minWidth: 36, textAlign: "right" }}>
        {pct < 1 ? "<1%" : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

// ── Næringsstoff-velger ───────────────────────────────────────
function NutrientPicker({ visible, onChange }: { visible: Set<string>; onChange: (next: Set<string>) => void }) {
  const allOn = ALL_IDS.every(id => visible.has(id));

  function toggle(id: string) {
    const next = new Set(visible);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  }

  function toggleGroup(group: string, on: boolean) {
    const next = new Set(visible);
    NUTRIENT_DEFS.filter(n => n.group === group).forEach(n => on ? next.add(n.id) : next.delete(n.id));
    onChange(next);
  }

  return (
    <div className="nutrient-picker">
      <label className="picker-select-all">
        <input type="checkbox" checked={allOn} onChange={() => onChange(allOn ? new Set() : new Set(ALL_IDS))} />
        <strong>Velg alle</strong>
      </label>
      <div className="picker-groups">
        {GROUPS.map(group => {
          const nuts = NUTRIENT_DEFS.filter(n => n.group === group);
          const allGroupOn = nuts.every(n => visible.has(n.id));
          return (
            <div key={group} className="nutrient-picker-group">
              <label className="picker-group-label">
                <input type="checkbox" checked={allGroupOn} onChange={e => toggleGroup(group, e.target.checked)} />
                <strong>{group}</strong>
              </label>
              <div className="picker-items">
                {nuts.map(n => (
                  <label key={n.id} className="picker-item">
                    <input type="checkbox" checked={visible.has(n.id)} onChange={() => toggle(n.id)} />
                    {n.label} <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>({n.unit})</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Hoved ─────────────────────────────────────────────────────
export default function MealPage() {
  const [items, setItems]           = useState<MealItem[]>([]);
  const [rawNuts, setRaw]           = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading]       = useState(false);
  const [visible, setVisible]       = useState<Set<string>>(new Set(DEFAULT_VISIBLE));
  const [showPicker, setShowPicker] = useState(false);
  const [showRdi, setShowRdi]       = useState(true);

  useEffect(() => {
    const saved = loadPrefs();
    setVisible(new Set(saved));
  }, []);

  function handleVisibleChange(next: Set<string>) {
    setVisible(next);
    savePrefs([...next]);
  }

  const fetchAll = useCallback(async (meal: MealItem[]) => {
    if (meal.length === 0) { setRaw({}); return; }
    setLoading(true);
    const results: Record<string, Record<string, number>> = {};
    await Promise.all(meal.map(async item => {
      try {
        const res  = await fetch(`/api/naering/${item.slug}`);
        const data = await res.json();
        const n: Record<string, number> = {};
        for (const [k, v] of Object.entries(data.nutrients ?? {})) n[k] = (v as any).value ?? 0;
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
    const handler = () => { const u = loadMeal(); setItems(u); fetchAll(u); };
    window.addEventListener("meal-updated", handler);
    return () => window.removeEventListener("meal-updated", handler);
  }, [fetchAll]);

  function getVal(foodId: string, nutId: string, grams: number) {
    return ((rawNuts[foodId]?.[nutId] ?? 0) * grams) / 100;
  }

  function getTotal(nutId: string) {
    return items.reduce((s, i) => s + getVal(i.foodId, nutId, i.grams), 0);
  }

  function fmt(val: number, dec: number) {
    return val === 0 ? "0" : val.toFixed(dec);
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
    const n = { ...rawNuts }; delete n[foodId]; setRaw(n);
  }

  const visibleNuts = NUTRIENT_DEFS.filter(n => visible.has(n.id));

  return (
    <main style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: ".75rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>🍽 Mitt måltid</h1>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button className="btn-toggle-nutrients" onClick={() => setShowRdi(p => !p)}>
            {showRdi ? "Skjul % RI" : "Vis % RI"}
          </button>
          <button className="btn-toggle-nutrients" onClick={() => setShowPicker(p => !p)}>
            {showPicker ? "▲ Skjul" : "⚙ Næringsstoffer"}
          </button>
          {items.length > 0 && (
            <button className="btn-clear-meal" onClick={() => { saveMeal([]); setItems([]); setRaw({}); }}>
              Tøm måltid
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        % RI = prosent av anbefalt daglig inntak (Nordic Nutrition Recommendations 2023, voksen 2000 kcal)
      </p>

      {showPicker && (
        <NutrientPicker visible={visible} onChange={handleVisibleChange} />
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "1.1rem" }}>Ingen matvarer lagt til.</p>
          <p style={{ marginTop: ".5rem" }}>Bruk søkefeltet øverst for å legge til matvarer.</p>
        </div>
      ) : (
        <div className="meal-table-wrapper">
          <table className="meal-table">
            <thead>
              <tr>
                <th className="col-name">Matvare</th>
                <th className="col-qty">Mengde</th>
                {visibleNuts.map(n => (
                  <th key={n.id} className="col-nut">
                    {n.label}<br />
                    <span style={{ fontWeight: 400, fontSize: ".75rem", color: "var(--text-muted)" }}>{n.unit}</span>
                  </th>
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
                    <div style={{ display: "flex", gap: ".35rem", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="number" min="0.5" step="0.5" value={item.qty}
                        onChange={e => {
                          const qty = parseFloat(e.target.value) || 1;
                          const p = PORTIONS.find(p => p.label === item.portionLabel) ?? PORTIONS[0];
                          updateItem(item.foodId, { qty, grams: Math.round(qty * p.factor) });
                        }}
                        className="meal-item-grams" style={{ width: 55 }}
                      />
                      <select
                        value={item.portionLabel}
                        onChange={e => {
                          const p = PORTIONS.find(p => p.label === e.target.value) ?? PORTIONS[0];
                          updateItem(item.foodId, { portionLabel: p.label, grams: Math.round(item.qty * p.factor) });
                        }}
                        className="add-portion" style={{ fontSize: ".8rem" }}
                      >
                        {PORTIONS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                      <span style={{ fontSize: ".75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{item.grams}g</span>
                    </div>
                  </td>
                  {visibleNuts.map(n => (
                    <td key={n.id} className="col-nut">
                      {loading ? "…" : fmt(getVal(item.foodId, n.id, item.grams), n.decimals)}
                    </td>
                  ))}
                  <td className="col-del">
                    <button onClick={() => removeItem(item.foodId)} className="meal-item-remove" title="Fjern">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Totallinje */}
              <tr>
                <td className="col-name" style={{ fontWeight: 700 }}>Totalt</td>
                <td className="col-qty" style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
                  {items.reduce((s, i) => s + i.grams, 0)} g
                </td>
                {visibleNuts.map(n => (
                  <td key={n.id} className="col-nut total-cell">
                    {loading ? "…" : fmt(getTotal(n.id), n.decimals)}
                  </td>
                ))}
                <td className="col-del"></td>
              </tr>

              {/* % av anbefalt daglig inntak */}
              {showRdi && (
                <tr>
                  <td className="col-name" style={{ fontWeight: 700, fontSize: ".85rem", color: "var(--text-muted)" }}>% RI</td>
                  <td className="col-qty"></td>
                  {visibleNuts.map(n => {
                    if (!n.rdi) return <td key={n.id} className="col-nut" style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>—</td>;
                    const total = getTotal(n.id);
                    const pct = (total / n.rdi) * 100;
                    return (
                      <td key={n.id} className="col-nut" style={{ padding: ".4rem .5rem" }}>
                        {loading ? "…" : <RdiBar pct={pct} />}
                      </td>
                    );
                  })}
                  <td className="col-del"></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
