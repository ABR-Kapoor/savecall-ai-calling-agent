import pg from "pg";
process.loadEnvFile(".env");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const res1 = await pool.query(
    "UPDATE whatsapp_conversations SET customer_phone = 'LID:' || replace(replace(customer_phone, '@lid', ''), '+', '') WHERE customer_phone LIKE '%@lid%'"
  );
  console.log("Fixed conversations:", res1.rowCount);

  const res2 = await pool.query(
    "UPDATE whatsapp_messages SET phone = 'LID:' || replace(replace(phone, '@lid', ''), '+', '') WHERE phone LIKE '%@lid%'"
  );
  console.log("Fixed messages:", res2.rowCount);

  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
