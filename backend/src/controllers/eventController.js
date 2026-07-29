import { publishEvent } from "../kafka/producer.js";
import { processEvent } from "../services/fifoService.js";

/* POST /api/events — push one event. */
export async function pushEvent(req, res, next) {
  try {
    const event = { timestamp: new Date().toISOString(), ...req.body };
    const viaKafka = await publishEvent(event);
    if (!viaKafka) await processEvent(event);
    res.json({ ok: true, via: viaKafka ? "kafka" : "direct", event });
  } catch (err) {
    next(err);
  }
}

/* POST /api/simulate — pushes 5–10 realistic dummy transactions */
export async function simulate(req, res, next) {
  try {
    const products = ["PRD001", "PRD002", "PRD003"];
    const count = 5 + Math.floor(Math.random() * 6); // 5..10
    const events = [];

    for (let i = 0; i < count; i++) {
      const product_id = products[Math.floor(Math.random() * products.length)];
      // Bias early events towards purchases so FIFO layers exist
      const isPurchase = i < 2 || Math.random() < 0.55;

      events.push(
        isPurchase
          ? {
              product_id,
              event_type: "purchase",
              quantity: 10 + Math.floor(Math.random() * 41),
              unit_price: Number((80 + Math.random() * 60).toFixed(2)),
              timestamp: new Date().toISOString(),
            }
          : {
              product_id,
              event_type: "sale",
              quantity: 1 + Math.floor(Math.random() * 15),
              timestamp: new Date().toISOString(),
            }
      );
    }

    const results = [];
    for (const event of events) {
      try {
        const viaKafka = await publishEvent(event);
        if (!viaKafka) await processEvent(event);
        results.push({ ok: true, event });
      } catch (err) {
        // e.g. insufficient stock on a random sale — report, don't abort
        results.push({ ok: false, event, error: err.message });
      }
    }

    res.json({ pushed: results.length, results });
  } catch (err) {
    next(err);
  }
}
