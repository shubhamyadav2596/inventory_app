import { Kafka, logLevel } from "kafkajs";
import env from "../config/env.js";


export function createKafka(clientId) {
  return new Kafka({
    clientId,
    brokers: [env.kafka.broker],
    ssl: true,
    sasl: {
      mechanism: "plain",
      username: env.kafka.apiKey,
      password: env.kafka.apiSecret,
    },
    logLevel: logLevel.ERROR,
  });
}
