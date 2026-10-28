import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must target an explicitly selected development database');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const dummyVec = '[' + new Array(384).fill(0.01).join(',') + ']';
  const tenantId = 'a0000000-0000-0000-0000-000000000001';
  const agentId = '96c4b396-0519-47c7-a3c3-f5e29a0b1e02';
  const res = await pool.query(
    'SELECT * FROM match_document_chunks($1::uuid, $2::uuid, $3::vector, $4::float8, $5::int4, $6::varchar)',
    [tenantId, agentId, dummyVec, 0.1, 5, 'all-minilm-l6-v2-v1']
  );
  console.log('✓ 6-param match_document_chunks succeeded! Rows:', res.rows);
  await pool.end();
}
test().catch(console.error);
