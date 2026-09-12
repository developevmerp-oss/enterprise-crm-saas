const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_AxXYlyre7md0@ep-lucky-forest-aezyo4ih-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const t1 = '11111111-1111-1111-1111-111111111111';

  const check = await pool.query('SELECT count(*) FROM quotations WHERE tenant_id = $1', [t1]);
  if (parseInt(check.rows[0].count, 10) > 0) {
    console.log('Quotations already exist:', check.rows[0].count);
    process.exit(0);
  }

  const q1 = await pool.query(`
    INSERT INTO quotations (tenant_id, deal_id, quote_number, total_amount, status, valid_until, items)
    VALUES (
      $1,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'QT-2026-001',
      48000.00,
      'DRAFT',
      CURRENT_DATE + 30,
      '[
        {"name": "Enterprise Cloud SaaS Core License", "quantity": 1, "unit_price": 28000, "total": 28000},
        {"name": "API and ERP Integration Pipeline", "quantity": 1, "unit_price": 12000, "total": 12000},
        {"name": "Dedicated SLA 24/7 Support Tier", "quantity": 1, "unit_price": 8000, "total": 8000}
      ]'::jsonb
    ) RETURNING id, quote_number, total_amount;
  `, [t1]);

  const q2 = await pool.query(`
    INSERT INTO quotations (tenant_id, deal_id, quote_number, total_amount, status, valid_until, items)
    VALUES (
      $1,
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      'QT-2026-002',
      65000.00,
      'DRAFT',
      CURRENT_DATE + 30,
      '[
        {"name": "Greenfield Smart Factory Automation Platform", "quantity": 1, "unit_price": 45000, "total": 45000},
        {"name": "On-Premises Sensor Gateway Setup", "quantity": 2, "unit_price": 10000, "total": 20000}
      ]'::jsonb
    ) RETURNING id, quote_number, total_amount;
  `, [t1]);

  console.log('SUCCESSFULLY SEEDED QUOTATIONS:', q1.rows[0], q2.rows[0]);
  process.exit(0);
}

run().catch(e => {
  console.error('SEED ERROR:', e);
  process.exit(1);
});
