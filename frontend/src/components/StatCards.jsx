const fmt = (n) =>
  Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function StatCards({ stock }) {
  const totalProducts = stock.length;
  const totalUnits = stock.reduce((s, p) => s + Number(p.current_qty), 0);
  const totalValue = stock.reduce((s, p) => s + Number(p.total_cost), 0);

  const cards = [
    { label: "Total Products", value: totalProducts, icon: "🏷️", accent: "text-brand-600" },
    { label: "Units in Stock", value: fmt(totalUnits), icon: "📦", accent: "text-emerald-600" },
    { label: "Inventory Value", value: `₹ ${fmt(totalValue)}`, icon: "💰", accent: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
        >
          <div className="text-3xl">{c.icon}</div>
          <div>
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
