import pool from "../db/pool.js";
import { broadcast } from "./eventBus.js";


/** Ensure the product row exists (auto-create on first event). */
async function ensureProduct(client, productId) {
  await client.query(
    `INSERT INTO products (product_id, name)
     VALUES ($1, $1)
     ON CONFLICT (product_id) DO NOTHING`,
    [productId]
  );
}

/**
 * Handle a PURCHASE event → create a new FIFO batch.
 */
export async function recordPurchase({ product_id, quantity, unit_price, timestamp }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureProduct(client, product_id);

    const { rows } = await client.query(
      `INSERT INTO inventory_batches
         (product_id, quantity, remaining_qty, unit_price, purchased_at)
       VALUES ($1, $2, $2, $3, $4)
       RETURNING batch_id`,
      [product_id, quantity, unit_price, timestamp]
    );

    await client.query("COMMIT");
    broadcast("inventory-update", { type: "purchase", product_id });
    return { batch_id: rows[0].batch_id };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function recordSale({ product_id, quantity, timestamp }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureProduct(client, product_id);

    // 1. Oldest open batches first, locked for this transaction
    const { rows: batches } = await client.query(
      `SELECT batch_id, remaining_qty, unit_price
         FROM inventory_batches
        WHERE product_id = $1 AND remaining_qty > 0
        ORDER BY purchased_at ASC, batch_id ASC
        FOR UPDATE`,
      [product_id]
    );

    const available = batches.reduce((s, b) => s + b.remaining_qty, 0);
    if (available < quantity) {
      throw new Error(
        `Insufficient stock for ${product_id}: need ${quantity}, have ${available}`
      );
    }

    // 2. Allocate quantity across batches, oldest first
    let needed = quantity;
    let totalCost = 0;
    const allocations = [];

    for (const batch of batches) {
      if (needed === 0) break;
      const take = Math.min(needed, batch.remaining_qty);
      const cost = take * Number(batch.unit_price);

      allocations.push({
        batch_id: batch.batch_id,
        quantity: take,
        unit_price: Number(batch.unit_price),
        cost,
      });

      await client.query(
        `UPDATE inventory_batches
            SET remaining_qty = remaining_qty - $1
          WHERE batch_id = $2`,
        [take, batch.batch_id]
      );

      totalCost += cost;
      needed -= take;
    }

    // 3. Persist sale + per-batch allocation audit trail
    const { rows } = await client.query(
      `INSERT INTO sales (product_id, quantity, total_cost, sold_at)
       VALUES ($1, $2, $3, $4)
       RETURNING sale_id`,
      [product_id, quantity, totalCost.toFixed(2), timestamp]
    );
    const saleId = rows[0].sale_id;

    for (const a of allocations) {
      await client.query(
        `INSERT INTO sale_allocations (sale_id, batch_id, quantity, unit_price, cost)
         VALUES ($1, $2, $3, $4, $5)`,
        [saleId, a.batch_id, a.quantity, a.unit_price, a.cost.toFixed(2)]
      );
    }

    await client.query("COMMIT");
    broadcast("inventory-update", { type: "sale", product_id });
    return { sale_id: saleId, total_cost: totalCost, allocations };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Route an incoming event 
 */
export async function processEvent(event) {
  const { product_id, event_type, quantity, unit_price, timestamp } = event || {};

  if (!product_id || !event_type || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    throw new Error("Invalid event: product_id, event_type and positive quantity are required");
  }
  const ts = timestamp || new Date().toISOString();

  if (event_type === "purchase") {
    if (!Number.isFinite(Number(unit_price)) || Number(unit_price) < 0) {
      throw new Error("Invalid event: purchase requires a non-negative unit_price");
    }
    return recordPurchase({ product_id, quantity: Number(quantity), unit_price: Number(unit_price), timestamp: ts });
  }
  if (event_type === "sale") {
    return recordSale({ product_id, quantity: Number(quantity), timestamp: ts });
  }
  throw new Error(`Unknown event_type "${event_type}"`);
}
