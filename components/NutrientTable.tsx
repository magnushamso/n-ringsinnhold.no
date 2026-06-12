// components/NutrientTable.tsx

// Gruppert visning av næringsstoffer
const NUTRIENT_GROUPS = [
  {
    label: "Energi",
    ids: ["Enerc", "Enerc_kcal"],
  },
  {
    label: "Makronæringsstoffer",
    ids: ["Protein", "Fett", "Karbo", "Sukker", "Fiber", "Alkohol", "Vann"],
  },
  {
    label: "Fettsyrer",
    ids: ["Mettet", "Enumet", "Polyl", "Omega-3", "Omega-6", "Trans", "Kolest"],
  },
  {
    label: "Vitaminer",
    ids: ["Vit A", "Retinol", "B-karo", "Vit E", "Vit B1", "Vit B2", "Niacin", "NIAEQ", "Vit B6", "Folat", "Vit B12", "Vit C", "Vit D", "VITK1", "VITK2"],
  },
  {
    label: "Mineraler",
    ids: ["Ca", "Fe", "K", "Mg", "Na", "P", "Se", "Zn", "Cu", "I"],
  },
];

interface NutrientValue {
  value: number | null;
  unit: string;
  name: string;
}

interface Props {
  nutrients: Record<string, NutrientValue>;
}

export default function NutrientTable({ nutrients }: Props) {
  if (!nutrients) return null;

  // Finn næringsstoffer som ikke er i noen forhåndsdefinert gruppe
  const allGroupedIds = new Set(NUTRIENT_GROUPS.flatMap((g) => g.ids));
  const ungrouped = Object.entries(nutrients).filter(
    ([id]) => !allGroupedIds.has(id)
  );

  return (
    <section className="nutrient-table">
      <h2>Næringsstoffer per 100 g</h2>

      {NUTRIENT_GROUPS.map((group) => {
        const rows = group.ids
          .filter((id) => nutrients[id] != null)
          .map((id) => ({ id, ...nutrients[id] }));

        if (rows.length === 0) return null;

        return (
          <div key={group.label} className="nutrient-group">
            <h3>{group.label}</h3>
            <table>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="nutrient-value">
                      {row.value != null ? row.value : "—"}
                    </td>
                    <td className="nutrient-unit">{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {ungrouped.length > 0 && (
        <div className="nutrient-group">
          <h3>Andre</h3>
          <table>
            <tbody>
              {ungrouped.map(([id, row]) => (
                <tr key={id}>
                  <td>{row.name}</td>
                  <td className="nutrient-value">
                    {row.value != null ? row.value : "—"}
                  </td>
                  <td className="nutrient-unit">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
