import { Router } from "express";
import { login } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import {
  stockOverview,
  ledger,
  batches,
  stream,
} from "../controllers/inventoryController.js";
import { pushEvent, simulate } from "../controllers/eventController.js";

const router = Router();

// ---- Public ----
router.get("/health", (req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));
router.post("/auth/login", login);

// ---- Protected (JWT) ----
router.get("/inventory", requireAuth, stockOverview);
router.get("/ledger", requireAuth, ledger);
router.get("/batches/:productId", requireAuth, batches);
router.post("/events", requireAuth, pushEvent);
router.post("/simulate", requireAuth, simulate);

// SSE — EventSource cannot send headers, so token is passed as ?token=
// (kept simple for the assignment; validated inside controller if needed)
router.get("/stream", stream);

export default router;
