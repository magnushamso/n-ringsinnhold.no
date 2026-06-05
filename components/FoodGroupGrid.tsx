// components/FoodGroupGrid.tsx

interface Group {
  id: string;
  name_nb: string;
}

export default function FoodGroupGrid({ groups }: { groups: Group[] }) {
  if (!groups?.length) return null;
  return (
    <div className="group-grid">
      {groups.map((g) => (
        <a key={g.id} href={`/kategori/${g.id}`} className="group-card">
          {g.name_nb}
        </a>
      ))}
    </div>
  );
}
