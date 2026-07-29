
-- 1. Products master
CREATE TABLE IF NOT EXISTS products (
  product_id   VARCHAR(50) PRIMARY KEY,
  name         VARCHAR(120) NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Inventory batches — 
CREATE TABLE IF NOT EXISTS inventory_batches (
  batch_id      SERIAL PRIMARY KEY,
  product_id    VARCHAR(50) NOT NULL REFERENCES products(product_id),
  quantity      INTEGER      NOT NULL CHECK (quantity > 0),
  remaining_qty INTEGER      NOT NULL CHECK (remaining_qty >= 0),
  unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  purchased_at  TIMESTAMPTZ  NOT NULL
);

-- Fast lookup of oldest open batches per product (heart of FIFO)
CREATE INDEX IF NOT EXISTS idx_batches_fifo
  ON inventory_batches (product_id, purchased_at, batch_id)
  WHERE remaining_qty > 0;

-- 3. Sales — one row per sale event
CREATE TABLE IF NOT EXISTS sales (
  sale_id     SERIAL PRIMARY KEY,
  product_id  VARCHAR(50)  NOT NULL REFERENCES products(product_id),
  quantity    INTEGER      NOT NULL CHECK (quantity > 0),
  total_cost  NUMERIC(14,2) NOT NULL,
  sold_at     TIMESTAMPTZ  NOT NULL
);

-- 4. Sale allocations — audit trail of WHICH batch each sale consumed
CREATE TABLE IF NOT EXISTS sale_allocations (
  allocation_id SERIAL PRIMARY KEY,
  sale_id       INTEGER NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  batch_id      INTEGER NOT NULL REFERENCES inventory_batches(batch_id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(12,2) NOT NULL,
  cost          NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alloc_sale ON sale_allocations (sale_id);
