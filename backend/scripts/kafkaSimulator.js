
import "dotenv/config";
import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "inventory-simulator",
  brokers: [process.env.KAFKA_BROKER],
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET,
  },
});

const TOPIC = process.env.KAFKA_TOPIC || "inventory-events";
const PRODUCTS = ["PRD001", "PRD002", "PRD003"];

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function makeEvent(i) {
  const product_id = PRODUCTS[rand(0, PRODUCTS.length - 1)];
  const isPurchase = i < 2 || Math.random() < 0.55; // seed stock first
  const base = { product_id, quantity: rand(5, 50), timestamp: new Date().toISOString() };
  return isPurchase
    ? { ...base, event_type: "purchase", unit_price: Number((80 + Math.random() * 60).toFixed(2)) }
    : { ...base, event_type: "sale", quantity: rand(1, 15) };
}

async function main() {
  const producer = kafka.producer();
  await producer.connect();
  console.log(`✅ Connected to Confluent Cloud, topic "${TOPIC}"`);

  const count = rand(5, 10);
  for (let i = 0; i < count; i++) {
    const event = makeEvent(i);
    await producer.send({
      topic: TOPIC,
      messages: [{ key: event.product_id, value: JSON.stringify(event) }],
    });
    console.log(`📤 [${i + 1}/${count}]`, event.event_type.padEnd(8), event.product_id, "qty:", event.quantity);
    await new Promise((r) => setTimeout(r, 800)); // realistic spacing
  }

  await producer.disconnect();
  console.log("🏁 Done — check the dashboard for live updates.");
}

main().catch((err) => {
  console.error("❌ Simulator failed:", err.message);
  process.exit(1);
});
