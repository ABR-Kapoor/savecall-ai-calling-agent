import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:0cd352b4c767620fc47fb453f8a5cf0f@ufmgh6q8.ap-southeast.database.insforge.app:5432/insforge?sslmode=require' });

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
