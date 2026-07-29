import app from "./app.js";
import env from "./config/env.js";
import { startConsumer } from "./kafka/consumer.js";

app.listen(env.port, () => {
  console.log(`🚀 API running on http://localhost:${env.port}`);
  // Start Kafka consumer alongside the API (single Render service)
  startConsumer().catch((err) =>
    console.error("Kafka consumer failed to start:", err.message)
  );
});
