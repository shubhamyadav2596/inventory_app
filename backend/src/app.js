import express from "express";
import cors from "cors";
import env from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();


app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl/Postman have no Origin header)
      if (!origin || env.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", routes);
app.get("/", (req, res) =>
  res.json({ name: "Inventory FIFO API", docs: "/api/health" })
);
app.use(errorHandler);

export default app;
