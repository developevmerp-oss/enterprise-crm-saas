const { pool } = require('./init');

async function runEmailMigration() {
  console.log('Running email tracking migration...');
  const sql = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS tracked_emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
      quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
      recipient_email VARCHAR(255) NOT NULL,
      recipient_name VARCHAR(255),
      sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      body_html TEXT NOT NULL,
      tracking_token VARCHAR(100) UNIQUE NOT NULL,
      proposal_token VARCHAR(100) UNIQUE,
      status VARCHAR(50) DEFAULT 'SENT',
      sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      opened_at TIMESTAMPTZ,
      open_count INTEGER DEFAULT 0,
      last_opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      click_count INTEGER DEFAULT 0,
      last_clicked_at TIMESTAMPTZ,
      user_agent TEXT,
      ip_address VARCHAR(100),
      proposal_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tracked_emails_token ON tracked_emails(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_tracked_emails_lead ON tracked_emails(lead_id);
    CREATE INDEX IF NOT EXISTS idx_tracked_emails_tenant ON tracked_emails(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tracked_emails_proposal ON tracked_emails(proposal_token);
  `;

  await pool.query(sql);
  console.log('✅ tracked_emails table and indexes successfully verified in PostgreSQL!');
}

runEmailMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
