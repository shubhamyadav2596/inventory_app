# 📦 Inventory Management System (FIFO) — Real-Time Ingestion & Live Dashboard

A full-stack inventory tool for a small trading business. Purchase/sale events flow
in through **Apache Kafka (Confluent Cloud)**, the backend applies **FIFO costing**
and persists everything to **PostgreSQL (Neon)**, and a **React + Tailwind** dashboard
shows stock, costing and the transaction ledger **live**.

![Architecture](docs/diagrams/architecture.png)

## 🔗 Live Links & Credentials

| Item              | Value                                             |
| ----------------- | ------------------------------------------------- |
| Frontend (Vercel) | `https://<your-app>.vercel.app`                   |
| Backend (Render)  | `https://<your-api>.onrender.com` (`/api/health`) |
| Login ID          | `admin`                                           |
| Password          | `admin123`                                        |

> Replace with your actual URLs after deploying (steps below).

---

## 🧠 Brief on FIFO Logic

**FIFO (First-In, First-Out)** assumes the *oldest* stock is sold first, so the
cost of a sale is taken from the oldest purchase batches.

![FIFO Explained](docs/diagrams/fifo-explained.png)

**How this repo implements it** (`backend/src/services/fifoService.js`):

1. **Purchase event** → insert a row in `inventory_batches` with
   `quantity`, `remaining_qty`, `unit_price`, `purchased_at`. Each row is a *cost layer*.
2. **Sale event** → inside **one DB transaction**:
   - `SELECT ... WHERE remaining_qty > 0 ORDER BY purchased_at ASC ... FOR UPDATE`
     — locks the open batches oldest-first (row locks prevent two concurrent
     sales from consuming the same stock).
   - Walk the batches taking `min(needed, remaining_qty)` from each until the
     sale quantity is covered; decrement each batch's `remaining_qty`.
   - Insert the `sales` row with the summed FIFO cost, **plus one
     `sale_allocations` row per consumed batch** — the exact quantity & cost
     drawn from each batch (a full audit trail).
   - If total available stock < sale quantity → transaction rolls back with
     *"Insufficient stock"* (no negative inventory, no partial writes).

**Worked example:** buy 50 @ ₹100, buy 30 @ ₹120, then sell 60
→ COGS = 50×100 + 10×120 = **₹6,200**; remaining stock = 20 units @ ₹120 = **₹2,400**.

**Dashboard math** (from remaining batches only):
- *Total Inventory Cost* = Σ `remaining_qty × unit_price`
- *Avg Cost per Unit* = Total Inventory Cost ÷ Σ `remaining_qty`

---

## 🗄️ Data Model

![DB Schema](docs/diagrams/db-schema.png)

| Table               | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `products`          | Product master (auto-created on first event)                   |
| `inventory_batches` | One row per purchase — the FIFO cost layers (`remaining_qty`)  |
| `sales`             | One row per sale with total FIFO cost                          |
| `sale_allocations`  | Which batch each sale consumed: exact qty, unit price and cost |

Schema: [`backend/src/db/schema.sql`](backend/src/db/schema.sql)

---

## 📁 Project Structure

```
inventory-fifo/
├── backend/
│   ├── scripts/
│   │   └── kafkaSimulator.js      # standalone Kafka producer (deliverable)
│   └── src/
│       ├── config/env.js          # all env config in one place
│       ├── db/                    # pool, schema.sql, init script
│       ├── kafka/                 # Confluent client, consumer, producer
│       ├── services/              # fifoService (core logic), inventoryService, eventBus (SSE)
│       ├── controllers/           # thin request handlers
│       ├── routes/index.js        # API routes
│       ├── middleware/            # JWT auth, error handler
│       ├── app.js                 # express app + CORS origins
│       └── server.js              # entrypoint (API + Kafka consumer)
├── frontend/
│   └── src/
│       ├── pages/                 # LoginPage, DashboardPage
│       ├── components/            # Navbar, StatCards, StockTable, LedgerTable, SimulatorPanel
│       ├── routes/AppRoutes.jsx   # routing + ProtectedRoute guard
│       ├── context/AuthContext.jsx
│       └── services/api.js        # single API client
├── docs/                          # demo PNGs + diagrams
└── render.yaml                    # Render blueprint for the backend
```

---

## 🔌 API Reference

| Method | Endpoint                 | Auth | Description                                    |
| ------ | ------------------------ | ---- | ---------------------------------------------- |
| GET    | `/api/health`            | –    | Health check                                   |
| POST   | `/api/auth/login`        | –    | `{username, password}` → `{token}`             |
| GET    | `/api/inventory`         | JWT  | Stock overview (qty, FIFO value, avg cost)     |
| GET    | `/api/ledger`            | JWT  | Purchases + sales time series with allocations |
| GET    | `/api/batches/:productId`| JWT  | FIFO batches for a product                     |
| POST   | `/api/events`            | JWT  | Push one event (→ Kafka, or direct fallback)   |
| POST   | `/api/simulate`          | JWT  | Push 5–10 random dummy events                  |
| GET    | `/api/stream`            | –    | Server-Sent Events for live dashboard refresh  |

Event shape (Kafka & REST):

```json
{
  "product_id": "PRD001",
  "event_type": "purchase",
  "quantity": 50,
  "unit_price": 100.0,
  "timestamp": "2025-07-12T10:00:00Z"
}
```
For `"sale"` events `unit_price` is omitted — cost comes from FIFO.

---

## 🖥️ Run in Localhost

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech) Postgres database (free tier)
- (Optional) A [Confluent Cloud](https://confluent.cloud) Kafka cluster (free trial)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # fill DATABASE_URL (Neon) + Kafka keys
npm run db:init             # creates tables
npm run dev                 # API on http://localhost:5000
```

> **No Kafka yet?** Set `KAFKA_ENABLED=false` in `.env` — events pushed from the
> dashboard are processed directly by the FIFO engine, so everything still works.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                 # http://localhost:5173
```

Login with `admin / admin123`.

### 3. How to run the Kafka producer (simulator) locally

Create the topic **`inventory-events`** in Confluent Cloud
(Cluster → Topics → Create topic, 1 partition is fine), create an API key, put
`KAFKA_BROKER`, `KAFKA_API_KEY`, `KAFKA_API_SECRET` in `backend/.env`, then:

```bash
cd backend
npm run simulate
```

The script pushes 5–10 random purchase/sale events to the topic; the consumer
inside the backend picks them up and the dashboard updates live (SSE).

---

## ☁️ Deployment

**Backend → Render**
1. New → Web Service → connect this repo, root dir `backend`.
2. Build `npm install`, start `npm start` (or use `render.yaml` blueprint).
3. Set env vars: `DATABASE_URL`, `KAFKA_*`, `AUTH_USER`, `AUTH_PASS`,
   `JWT_SECRET`, and **`ALLOWED_ORIGINS=https://<your-app>.vercel.app`**.
4. Run `npm run db:init` once (Render Shell) to create tables.

**Frontend → Vercel**
1. Import repo, root dir `frontend` (framework: Vite).
2. Env var: `VITE_API_URL=https://<your-api>.onrender.com`.
3. Deploy — then add the Vercel URL to `ALLOWED_ORIGINS` on Render.

> CORS note: the backend only allows origins listed in `ALLOWED_ORIGINS`
> (see `backend/src/app.js`), so browsers on any other domain are blocked.

---

## 🖼️ Demo

| Login | Dashboard (live) |
| ----- | ---------------- |
| ![Login](docs/demo-login.png) | ![Dashboard](docs/demo-live-simulation.png) |

---

## ✅ Requirement Checklist

- [x] Kafka topic `inventory-events` on Confluent Cloud + consumer service
- [x] Neon PostgreSQL: `products`, `inventory_batches`, `sales` (+ `sale_allocations` audit)
- [x] FIFO: purchases create batches, sales consume oldest first, per-batch cost recorded
- [x] Dashboard: stock overview (qty / total cost / avg cost), ledger with FIFO breakdown
- [x] Live updates (SSE + polling fallback) + one-click 5–10 event simulator
- [x] Login page (basic auth → JWT)
- [x] Kafka simulator script + this README
- [x] CORS origins locked down; Render/Vercel deployment configs included
