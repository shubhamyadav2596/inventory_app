import pool from "../db/pool.js";



/** Product Stock Overview: qty, total FIFO inventory value, avg cost. */
export async function getStockOverview() {
  const { rows } = await pool.query(`
    SELECT p.product_id,
           p.name,
           COALESCE(SUM(b.remaining_qty), 0)::int                    AS current_qty,
           COALESCE(SUM(b.remaining_qty * b.unit_price), 0)::numeric AS total_cost,
           CASE WHEN COALESCE(SUM(b.remaining_qty),0) > 0
                THEN ROUND(SUM(b.remaining_qty * b.unit_price) / SUM(b.remaining_qty), 2)
                ELSE 0 END                                           AS avg_cost
      FROM products p
      LEFT JOIN inventory_batches b
        ON b.product_id = p.product_id AND b.remaining_qty > 0
     GROUP BY p.product_id, p.name
     ORDER BY p.product_id
  `);
  return rows;
}

/** Transaction Ledger: purchases + sales  */
export async function getLedger(limit = 100) {
  const { rows } = await pool.query(
    `
    SELECT * FROM (
      SELECT 'purchase'                     AS type,
             b.product_id,
             b.quantity,
             b.unit_price,
             (b.quantity * b.unit_price)    AS total,
             b.purchased_at                 AS at,
             NULL::json                     AS allocations
        FROM inventory_batches b
      UNION ALL
      SELECT 'sale'                         AS type,
             s.product_id,
             s.quantity,
             ROUND(s.total_cost / s.quantity, 2) AS unit_price,
             s.total_cost                   AS total,
             s.sold_at                      AS at,
             (SELECT json_agg(json_build_object(
                       'batch_id', a.batch_id,
                       'quantity', a.quantity,
                       'unit_price', a.unit_price,
                       'cost', a.cost))
                FROM sale_allocations a
               WHERE a.sale_id = s.sale_id) AS allocations
        FROM sales s
    ) t
    ORDER BY t.at DESC
    LIMIT $1
  `,
    [limit]
  );
  return rows;
}

/** Open FIFO batches per product  */
export async function getBatches(productId) {
  const { rows } = await pool.query(
    `SELECT batch_id, product_id, quantity, remaining_qty, unit_price, purchased_at
       FROM inventory_batches
      WHERE product_id = $1
      ORDER BY purchased_at ASC, batch_id ASC`,
    [productId]
  );
  return rows;
}
