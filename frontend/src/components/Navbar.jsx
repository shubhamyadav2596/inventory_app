import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar({ live }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold" alt="Logo">
            📦
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight group relative">
              IMS (FIFO)
              <span class="invisible group-hover:visible absolute top-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md transition-opacity duration-200">
                Inventory Management System
              </span>
            </h1>
            <p className="text-xs text-slate-400 -mt-0.5">
              Real-time ingestion · Kafka · Neon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              live
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                live ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {live ? "LIVE" : "Polling"}
          </span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="text-sm font-medium text-slate-500 hover:text-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
