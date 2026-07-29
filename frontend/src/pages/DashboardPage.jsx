import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import Navbar from "../components/Navbar.jsx";
import StatCards from "../components/StatCards.jsx";
import StockTable from "../components/StockTable.jsx";
import LedgerTable from "../components/LedgerTable.jsx";
import SimulatorPanel from "../components/SimulatorPanel.jsx";


export default function DashboardPage() {
  const [stock, setStock] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [live, setLive] = useState(false);
  const esRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([api.getInventory(), api.getLedger()]);
      setStock(s);
      setLedger(l);
    } catch (err) {
      console.error("Refresh failed:", err.message);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Live updates via Server-Sent Events
    const es = new EventSource(api.streamUrl());
    es.addEventListener("connected", () => setLive(true));
    es.addEventListener("inventory-update", refresh);
    es.onerror = () => setLive(false);
    esRef.current = es;

    // Polling fallback
    const poll = setInterval(refresh, 10000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar live={live} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StatCards stock={stock} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <StockTable stock={stock} />
            <LedgerTable ledger={ledger} />
          </div>
          <div>
            <SimulatorPanel onDone={refresh} />
          </div>
        </div>
      </main>
    </div>
  );
}
