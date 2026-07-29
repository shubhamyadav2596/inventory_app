import env from "../config/env.js";
import { createKafka } from "./client.js";


let producer = null;

export async function getProducer() {
  if (!env.kafka.enabled) return null;
  if (!producer) {
    const kafka = createKafka("inventory-producer");
    producer = kafka.producer();
    await producer.connect();
    console.log("✅ Kafka producer connected");
  }
  return producer;
}

export async function publishEvent(event) {
  const p = await getProducer();
  if (!p) return false; // Kafka disabled → caller falls
  await p.send({
    topic: env.kafka.topic,
    messages: [{ key: event.product_id, value: JSON.stringify(event) }],
  });
  return true;
}
