import { useMemo, useState } from "react";

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGE_SIZES = [5, 10, 20, 50];


export default function LedgerTable({ ledger }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState({ key: "at", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /** True when any filter/sort differs from the default view. */
  const isFiltered =
    search !== "" || typeFilter !== "all" || sort.key !== "at" || sort.dir !== "desc";

  /** Reset search, type filter, sorting and pagination to defaults. */
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setSort({ key: "at", dir: "desc" });
    setPage(1);
  };

  /** Toggle sorting on a column: 1st click = asc, 2nd = desc. */
  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
    setPage(1);
  };

  /** 1. filter → 2. sort  */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = ledger.filter((t) => {
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesSearch =
        !q ||
        t.product_id.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let va, vb;
      switch (sort.key) {
        case "at":         va = new Date(a.at).getTime(); vb = new Date(b.at).getTime(); break;
        case "quantity":   va = Number(a.quantity);       vb = Number(b.quantity);       break;
        case "unit_price": va = Number(a.unit_price);     vb = Number(b.unit_price);     break;
        case "total":      va = Number(a.total);          vb = Number(b.total);          break;
        default:           va = String(a[sort.key]);      vb = String(b[sort.key]);      // type / product_id
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return rows;
  }, [ledger, search, typeFilter, sort]);

  /** 3. paginate */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const SortHeader = ({ label, sortKey, align = "left" }) => (
    <th
      onClick={() => toggleSort(sortKey)}
      className={`px-5 py-3 text-${align} cursor-pointer select-none hover:text-brand-600 transition whitespace-nowrap`}
      title={`Sort by ${label}`}
    >
      {label}{" "}
      <span className={sort.key === sortKey ? "text-brand-600" : "text-slate-300"}>
        {sort.key === sortKey ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </th>
  );

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
   
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="font-semibold text-slate-800 flex-1">📒 Transaction Ledger</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Clear filters */}
          <button
            onClick={clearFilters}
            disabled={!isFiltered}
            title="Reset search, filter and sorting"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            ✕ Clear filters
          </button>
          {/* Search */}
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 Search product / type…"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All types</option>
            <option value="purchase">Purchases</option>
            <option value="sale">Sales</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <SortHeader label="Time" sortKey="at" />
              <SortHeader label="Type" sortKey="type" />
              <SortHeader label="Product" sortKey="product_id" />
              <SortHeader label="Qty" sortKey="quantity" align="right" />
              <SortHeader label="Unit ₹" sortKey="unit_price" align="right" />
              <SortHeader label="Total ₹ (FIFO)" sortKey="total" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                  {ledger.length === 0 ? "No transactions yet." : "No results match your search."}
                </td>
              </tr>
            )}
            {pageRows.map((t, i) => (
              <tr key={`${t.type}-${t.at}-${i}`} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                  {new Date(t.at).toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      t.type === "purchase"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {t.type === "purchase" ? "PURCHASE" : "SALE"}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium">{t.product_id}</td>
                <td className="px-5 py-3 text-right">{t.quantity}</td>
                <td className="px-5 py-3 text-right">₹ {fmt(t.unit_price)}</td>
                <td className="px-5 py-3 text-right font-medium">
                  ₹ {fmt(t.total)}
                  {t.type === "sale" && t.allocations && (
                    <div className="mt-1 text-[11px] text-slate-400 font-normal">
                      {t.allocations.map((a, j) => (
                        <div key={j}>
                          {a.quantity} × ₹{fmt(a.unit_price)} (batch #{a.batch_id})
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
        <p className="text-slate-500 flex-1">
          Showing{" "}
          <b>
            {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, filtered.length)}
          </b>{" "}
          of <b>{filtered.length}</b> transactions
        </p>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} / page</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(1)} disabled={safePage === 1}>«</PageBtn>
            <PageBtn onClick={() => setPage(safePage - 1)} disabled={safePage === 1}>‹</PageBtn>
            <span className="px-3 py-1 text-slate-600">
              Page <b>{safePage}</b> / {totalPages}
            </span>
            <PageBtn onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}>›</PageBtn>
            <PageBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages}>»</PageBtn>
          </div>
        </div>
      </div>
    </section>
  );
}

function PageBtn({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-8 h-8 rounded-lg border border-slate-300 text-slate-600 hover:bg-brand-50 hover:border-brand-500 hover:text-brand-600 disabled:opacity-40 disabled:pointer-events-none transition"
    >
      {children}
    </button>
  );
}
