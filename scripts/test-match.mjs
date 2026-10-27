import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must target an explicitly selected development database');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const dummyVec = Array.from({ length: 384 }, () => 0.05);
  const vecStr = '[' + dummyVec.join(',') + ']';
  const tenantId = 'bde5fa88-bd7e-4ce3-9a48-f1fd7529bbb4';
  const agentId = 'bde5fa88-bd7e-4ce3-9a48-f1fd7529bbb4';

  const res = await pool.query('SELECT * FROM match_document_chunks($1, $2, $3::vector, $4, $5);', [
    tenantId,
    agentId,
    vecStr,
    0.5,
    5
  ]);
  console.log('✓ match_document_chunks succeeded! Rows returned:', res.rows.length);
  await pool.end();
}
test().catch(console.error);
