import fs from "node:fs";
import pg from "pg";

let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      connectionString = trimmed.slice("DATABASE_URL=".length).trim();
      break;
    }
  }
}
if (!connectionString) throw new Error("DATABASE_URL must target an explicitly selected development database");

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sql = fs.readFileSync("insforge/migrations/007_whatsapp_integrity_indexes.sql", "utf-8");
  console.log("Applying migration 007...");
  await pool.query(sql);
  console.log("Migration 007 applied successfully!");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration 007 failed:", err);
  pool.end();
  process.exit(1);
});
