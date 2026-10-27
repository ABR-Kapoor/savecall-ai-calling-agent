// Diversify policies in the active database to reflect multi-line insurance:
// Health, Motor, Life, Property, Commercial
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

const PLANS = [
  {
    policy_type: "health",
    plan_name: "Health Shield Gold Family Floater",
    premium_amount: 24500.00,
    nominee_relationship: "Spouse",
  },
  {
    policy_type: "motor",
    plan_name: "Motor Protect Private Car Comprehensive",
    premium_amount: 14200.00,
    nominee_relationship: "Father",
  },
  {
    policy_type: "life",
    plan_name: "Term Shield Pure Protection 1 Cr",
    premium_amount: 18000.00,
    nominee_relationship: "Daughter",
  },
  {
    policy_type: "property",
    plan_name: "Home Shield Dwelling & Contents Protection",
    premium_amount: 8500.00,
    nominee_relationship: "Spouse",
  },
  {
    policy_type: "commercial",
    plan_name: "Commercial Fleet & Goods-in-Transit Shield",
    premium_amount: 52000.00,
    nominee_relationship: "Business Partner",
  },
];

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, tenant_id, policy_number FROM policies ORDER BY created_at ASC");
    console.log(`Found ${res.rows.length} policies to diversify`);

    for (let i = 0; i < res.rows.length; i++) {
      const row = res.rows[i];
      const template = PLANS[i % PLANS.length];
      const typeSuffix = template.policy_type.substring(0, 3).toUpperCase();
      const updatedPolNumber = row.policy_number.replace(/-[A-Z]{3}$/, `-${typeSuffix}`);

      await client.query(
        `UPDATE policies
         SET policy_type = $1,
             plan_name = $2,
             premium_amount = $3,
             nominee_relationship = $4,
             policy_number = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          template.policy_type,
          template.plan_name,
          template.premium_amount,
          template.nominee_relationship,
          updatedPolNumber,
          row.id,
        ]
      );
      console.log(`Updated policy ${row.id} -> ${template.policy_type}: ${template.plan_name} (${updatedPolNumber})`);
    }

    const check = await client.query(
      `SELECT policy_type, count(*) as count, array_agg(plan_name) as sample_plans
       FROM policies
       GROUP BY policy_type`
    );
    console.log("Updated distribution:", check.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
