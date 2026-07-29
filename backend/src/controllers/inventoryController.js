import * as inventoryService from "../services/inventoryService.js";
import { addClient } from "../services/eventBus.js";

/** GET /api/inventory — Product Stock  */
export async function stockOverview(req, res, next) {
  try {
    res.json(await inventoryService.getStockOverview());
  } catch (err) {
    next(err);
  }
}

/** GET /api/ledger — Purchases + Sales  */
export async function ledger(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(await inventoryService.getLedger(limit));
  } catch (err) {
    next(err);
  }
}

/** GET /api/batches/:productId  */
export async function batches(req, res, next) {
  try {
    res.json(await inventoryService.getBatches(req.params.productId));
  } catch (err) {
    next(err);
  }
}

/** GET /api/stream — Server-Sent Events  */
export function stream(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write("event: connected\ndata: {}\n\n");
  addClient(res);
}
