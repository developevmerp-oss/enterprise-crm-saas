const { pool } = require('./init');
const bcrypt = require('bcryptjs');

async function safeInit() {
  const client = await pool.connect();
  try {
    console.log('Ensuring all schema tables exist safely...');

    // 1. Tenants
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'Enterprise Growth',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        settings JSONB DEFAULT '{"currency": "USD", "timezone": "UTC"}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Teams
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'SALES_EXECUTIVE',
        team_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Companies
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        industry VARCHAR(100),
        size VARCHAR(50),
        phone VARCHAR(50),
        address TEXT,
        owner_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Contacts
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255),
        company_id VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        job_title VARCHAR(150),
        owner_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure leads has tenant_id, score, budget, etc. if missing
    await client.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) DEFAULT '11111111-1111-1111-1111-111111111111';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2) DEFAULT 0;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(150) DEFAULT 'Sales Team';
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(150);
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_tracking_status VARCHAR(50) DEFAULT 'NOT_SENT';
    `);

    // Backfill company_name from company if present
    await client.query(`
      UPDATE leads SET company_name = company WHERE (company_name IS NULL OR company_name = '') AND company IS NOT NULL;
    `);

    // 7. Pipelines & Stages
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        pipeline_id VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        probability INTEGER DEFAULT 20,
        order_index INTEGER DEFAULT 0,
        color VARCHAR(50) DEFAULT 'emerald',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Deals
    await client.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        company_id VARCHAR(255),
        contact_id VARCHAR(255),
        pipeline_id VARCHAR(255),
        stage_id VARCHAR(255),
        amount NUMERIC(12, 2) DEFAULT 0,
        probability INTEGER DEFAULT 50,
        expected_close_date DATE,
        owner_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'OPEN',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Products
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(200) NOT NULL,
        sku VARCHAR(100),
        price NUMERIC(12, 2) DEFAULT 0,
        tax_rate NUMERIC(5, 2) DEFAULT 18,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Quotations
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        deal_id VARCHAR(255),
        quote_number VARCHAR(100) NOT NULL,
        total_amount NUMERIC(12, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'DRAFT',
        items JSONB DEFAULT '[]'::jsonb,
        valid_until DATE,
        public_token VARCHAR(100) UNIQUE,
        view_count INTEGER DEFAULT 0,
        accepted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Tasks
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50) DEFAULT 'MEDIUM',
        status VARCHAR(50) DEFAULT 'TODO',
        due_date DATE,
        assigned_to VARCHAR(255),
        related_type VARCHAR(50),
        related_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Activities
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255),
        user_id VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        related_type VARCHAR(50),
        related_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Tracked Emails
    await client.query(`
      CREATE TABLE IF NOT EXISTS tracked_emails (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id VARCHAR(255) NOT NULL,
        lead_id VARCHAR(255),
        deal_id VARCHAR(255),
        quotation_id VARCHAR(255),
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        body_html TEXT NOT NULL,
        tracking_token VARCHAR(100) UNIQUE NOT NULL,
        proposal_token VARCHAR(100),
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
    `);

    // Seed Tenants & Users if empty
    const tCount = await client.query('SELECT COUNT(*) FROM tenants');
    if (parseInt(tCount.rows[0].count, 10) === 0) {
      console.log('Seeding default tenant & users...');
      const defaultPasswordHash = await bcrypt.hash('admin123', 10);
      const t1Id = '11111111-1111-1111-1111-111111111111';

      await client.query(`
        INSERT INTO tenants (id, name, slug, plan, status, settings)
        VALUES ($1, 'Scaloy Digital Growth', 'scaloy-growth', 'Enterprise Ultimate', 'ACTIVE', '{"currency": "USD", "timezone": "IST"}'::jsonb)
        ON CONFLICT (slug) DO NOTHING;
      `, [t1Id]);

      await client.query(`
        INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
        VALUES 
        ('44444444-4444-4444-4444-444444444441', $1, 'admin@scaloy.com', $2, 'Master', 'Admin', 'SUPER_ADMIN', 'ACTIVE'),
        ('44444444-4444-4444-4444-444444444442', $1, 'owner@scaloy.com', $2, 'Karan', 'Shah', 'BUSINESS_OWNER', 'ACTIVE')
        ON CONFLICT DO NOTHING;
      `, [t1Id, defaultPasswordHash]);
    }

    console.log('✅ Safe schema initialization completed successfully!');
  } finally {
    client.release();
  }
}

safeInit()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('SafeInit failed:', err);
    process.exit(1);
  });
