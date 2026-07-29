import { useMemo, useState } from "react";
import { api } from "../services/api.js";

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PAGE_SIZES = [5, 10, 20, 50];

export default function StockTable({ stock }) {
  const [expanded, setExpanded] = useState(null);
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "product_id", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  /** True when any filter/sort differs from the default view. */
  const isFiltered =
    search !== "" || sort.key !== "product_id" || sort.dir !== "asc";

  /** Reset search, sorting and pagination to defaults. */
  const clearFilters = () => {
    setSearch("");
    setSort({ key: "product_id", dir: "asc" });
    setPage(1);
  };

  /** Toggle sorting on a column: 1st click = asc, 2nd = desc. */
  const toggleSort = (key) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
    setPage(1);
  };

  const toggleRow = async (productId) => {
    if (expanded === productId) return setExpanded(null);
    setExpanded(productId);
    setBatches(await api.getBatches(productId));
  };

  /** 1. filter → 2. sort (memoised) */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let rows = stock.filter(
      (p) =>
        !q ||
        p.product_id.toLowerCase().includes(q) ||
        (p.name || "").toLowerCase().includes(q),
    );

    const dir = sort.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let va, vb;
      switch (sort.key) {
        case "current_qty":
          va = Number(a.current_qty);
          vb = Number(b.current_qty);
          break;
        case "total_cost":
          va = Number(a.total_cost);
          vb = Number(b.total_cost);
          break;
        case "avg_cost":
          va = Number(a.avg_cost);
          vb = Number(b.avg_cost);
          break;
        default:
          va = String(a.product_id);
          vb = String(b.product_id);
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return rows;
  }, [stock, search, sort]);

  /** 3. paginate */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const SortHeader = ({ label, sortKey, align = "left" }) => (
    <th
      onClick={() => toggleSort(sortKey)}
      className={`px-5 py-3 text-${align} cursor-pointer select-none hover:text-brand-600 transition whitespace-nowrap`}
      title={`Sort by ${label}`}
    >
      {label}{" "}
      <span
        className={sort.key === sortKey ? "text-brand-600" : "text-slate-300"}
      >
        {sort.key === sortKey ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </th>
  );

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header + toolbar */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="font-semibold text-slate-800">
            📊 Product Stock Overview
          </h2>
          <p className="text-xs text-slate-400">click a row for FIFO batches</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Clear filters */}
          <button
            onClick={clearFilters}
            disabled={!isFiltered}
            title="Reset search and sorting"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-600 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            ✕ Clear filters
          </button>
          {/* Search */}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="🔍 Search product…"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <SortHeader label="Product ID" sortKey="product_id" />
              <SortHeader
                label="Current Qty"
                sortKey="current_qty"
                align="right"
              />
              <SortHeader
                label="Total Inventory Cost"
                sortKey="total_cost"
                align="right"
              />
              <SortHeader
                label="Avg Cost / Unit"
                sortKey="avg_cost"
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="px-5 py-8 text-center text-slate-400"
                >
                  {stock.length === 0
                    ? "No inventory yet — hit “Simulate” to push Kafka events →"
                    : "No products match your search."}
                </td>
              </tr>
            )}
            {pageRows.map((p) => (
              <FragmentRow
                key={p.product_id}
                product={p}
                expanded={expanded === p.product_id}
                batches={batches}
                onClick={() => toggleRow(p.product_id)}
              />
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
          of <b>{filtered.length}</b> products
        </p>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:outline-none"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <PageBtn onClick={() => setPage(1)} disabled={safePage === 1}>
              «
            </PageBtn>
            <PageBtn
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
            >
              ‹
            </PageBtn>
            <span className="px-3 py-1 text-slate-600">
              Page <b>{safePage}</b> / {totalPages}
            </span>
            <PageBtn
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
            >
              ›
            </PageBtn>
            <PageBtn
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
            >
              »
            </PageBtn>
          </div>
        </div>
      </div>
    </section>
  );
}

function FragmentRow({ product, expanded, batches, onClick }) {
  return (
    <>
      <tr
        onClick={onClick}
        className="hover:bg-brand-50 cursor-pointer transition"
      >
        <td className="px-5 py-3 font-medium text-slate-800">
          {expanded ? "▾ " : "▸ "}
          {product.product_id}
        </td>
        <td className="px-5 py-3 text-right">{product.current_qty}</td>
        <td className="px-5 py-3 text-right font-medium">
          ₹ {fmt(product.total_cost)}
        </td>
        <td className="px-5 py-3 text-right">₹ {fmt(product.avg_cost)}</td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan="4" className="bg-slate-50 px-5 py-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Open FIFO batches (oldest consumed first)
            </p>
            <div className="space-y-1">
              {batches
                .filter((b) => b.remaining_qty > 0)
                .map((b) => (
                  <div
                    key={b.batch_id}
                    className="flex justify-between text-xs bg-white rounded-lg px-3 py-2 border border-slate-200"
                  >
                    <span>
                      Batch #{b.batch_id} ·{" "}
                      {new Date(b.purchased_at).toLocaleString()}
                    </span>
                    <span>
                      {b.remaining_qty}/{b.quantity} left @ ₹{fmt(b.unit_price)}
                    </span>
                  </div>
                ))}
              {batches.filter((b) => b.remaining_qty > 0).length === 0 && (
                <p className="text-xs text-slate-400">
                  No open batches (all stock sold).
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
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
