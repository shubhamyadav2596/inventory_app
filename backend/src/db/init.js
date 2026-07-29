import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import pool from "./pool.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  const sql = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("✅ Database schema created / verified.");
  await pool.end();
}

init().catch((err) => {
  console.error("❌ DB init failed:", err.message);
  process.exit(1);
});
