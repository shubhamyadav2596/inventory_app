import env from "../config/env.js";
import { createKafka } from "./client.js";
import { processEvent } from "../services/fifoService.js";


export async function startConsumer() {
  if (!env.kafka.enabled) {
    console.log("⚠️  Kafka disabled (KAFKA_ENABLED != true) — using REST simulator only.");
    return;
  }

  const kafka = createKafka("inventory-consumer");
  const consumer = kafka.consumer({ groupId: env.kafka.groupId });

  await consumer.connect();
  await consumer.subscribe({ topic: env.kafka.topic, fromBeginning: false });
  console.log(`✅ Kafka consumer listening on topic "${env.kafka.topic}"`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log("📥 Kafka event:", event.event_type, event.product_id, event.quantity);
        await processEvent(event);
      } catch (err) {
        // Never crash the consumer on a bad message — log & move on.
        console.error("❌ Failed to process Kafka message:", err.message);
      }
    },
  });
}
