import { useState } from "react";
import { api } from "../services/api.js";


export default function SimulatorPanel({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [form, setForm] = useState({
    product_id: "PRD001",
    event_type: "purchase",
    quantity: 10,
    unit_price: 100,
  });

  const pushLog = (line) => setLog((l) => [line, ...l].slice(0, 12));

  const runSimulation = async () => {
    setBusy(true);
    try {
      const { results } = await api.simulate();
      results.forEach((r) =>
        pushLog(
          r.ok
            ? `✅ ${r.event.event_type} ${r.event.product_id} × ${r.event.quantity}`
            : `⚠️ ${r.event.event_type} ${r.event.product_id} — ${r.error}`
        )
      );
      onDone?.();
    } catch (err) {
      pushLog(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const pushManual = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const event = {
        product_id: form.product_id.trim(),
        event_type: form.event_type,
        quantity: Number(form.quantity),
        ...(form.event_type === "purchase"
          ? { unit_price: Number(form.unit_price) }
          : {}),
      };
      await api.pushEvent(event);
      pushLog(`✅ ${event.event_type} ${event.product_id} × ${event.quantity}`);
      onDone?.();
    } catch (err) {
      pushLog(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">⚡ Kafka Event Simulator</h2>
      </div>

      <div className="p-5 space-y-5">
        <button
          onClick={runSimulation}
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 transition disabled:opacity-60"
        >
          {busy ? "Pushing events…" : "🎲 Simulate 5–10 Transactions"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-slate-400">or push one event</span>
          </div>
        </div>

        <form onSubmit={pushManual} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className={input}
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              placeholder="Product ID"
              required
            />
            <select
              className={input}
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            >
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
            </select>
            <input
              className={input}
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="Quantity"
              required
            />
            {form.event_type === "purchase" && (
              <input
                className={input}
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                placeholder="Unit price"
                required
              />
            )}
          </div>
          <button
            disabled={busy}
            className="w-full rounded-lg border border-brand-600 text-brand-600 hover:bg-brand-50 font-semibold py-2 text-sm transition disabled:opacity-60"
          >
            Push Event →
          </button>
        </form>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Event log</p>
          <div className="bg-slate-900 rounded-lg p-3 h-44 overflow-y-auto font-mono text-[11px] text-emerald-300 space-y-1">
            {log.length === 0 && <p className="text-slate-500">— no events yet —</p>}
            {log.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
