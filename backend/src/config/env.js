import "dotenv/config";


const env = {
  port: Number(process.env.PORT) || 5001,

  // CORS — comma separated list 
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // Auth
  authUser: process.env.AUTH_USER || "admin",
  authPass: process.env.AUTH_PASS || "admin123@123",
  jwtSecret: process.env.JWT_SECRET || "dsffAweqihvIokddnkdnkiPqdfdMdjnfkdnHJdfjdij",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",

  // Database (Neon)
  databaseUrl: process.env.DATABASE_URL,

  // Kafka (Confluent Cloud)
  kafka: {
    enabled: process.env.KAFKA_ENABLED === "true",
    broker: process.env.KAFKA_BROKER,
    apiKey: process.env.KAFKA_API_KEY,
    apiSecret: process.env.KAFKA_API_SECRET,
    topic: process.env.KAFKA_TOPIC || "inventory-events",
    groupId: process.env.KAFKA_GROUP_ID || "fifo-worker-group",
  },
};

export default env;
