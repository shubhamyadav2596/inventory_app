import pg from "pg";
import env from "../config/env.js";


const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseUrl?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
  max: 10,
});

pool.on("error", (err) => console.error("Unexpected PG pool error:", err.message));

export default pool;
