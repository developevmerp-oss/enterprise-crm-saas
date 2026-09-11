const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/leadgen_crm';
const isSslRequired = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech');

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
  ssl: isSslRequired ? { rejectUnauthorized: false } : false
});

let isConnected = false;

// Mock fallback store in case Postgres is ever unreachable
const memoryStore = {
  tenants: [],
  users: [],
  companies: [],
  contacts: [],
  leads: [],
  pipelines: [],
  pipeline_stages: [],
  deals: [],
  tasks: [],
  activities: [],
  products: [],
  quotations: [],
  audit_logs: []
};

async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ [Enterprise CRM] Connected to PostgreSQL 18');
    isConnected = true;

    // Run schema safely
    try {
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await client.query(schemaSql);
    } catch (schemaErr) {
      // Tables already exist or partially configured, run safe migration check
      const { safeInitTables } = require('./safe_schema');
      await safeInitTables(client);
    }
    console.log('📦 [Enterprise CRM] Multi-tenant database tables verified.');

    // Check if initial tenant exists
    const checkTenants = await client.query('SELECT COUNT(*) FROM tenants');
    if (parseInt(checkTenants.rows[0].count, 10) === 0) {
      console.log('🌱 [Enterprise CRM] Seeding initial multi-tenant data...');

      const defaultPasswordHash = await bcrypt.hash('admin123', 10);

      // 1. Tenant 1: Scaloy Digital Enterprise (Your Primary Business)
      const t1Res = await client.query(`
        INSERT INTO tenants (id, name, slug, plan, status, settings)
        VALUES ('11111111-1111-1111-1111-111111111111', 'Scaloy Digital Growth', 'scaloy-growth', 'Enterprise Ultimate', 'ACTIVE', '{"currency": "USD", "timezone": "IST"}'::jsonb)
        RETURNING id
      `);
      const t1Id = t1Res.rows[0].id;

      // 2. Tenant 2: Apex Global Logistics (External Client Business)
      const t2Res = await client.query(`
        INSERT INTO tenants (id, name, slug, plan, status, settings)
        VALUES ('22222222-2222-2222-2222-222222222222', 'Apex Global Logistics', 'apex-logistics', 'Pro Business', 'ACTIVE', '{"currency": "USD", "timezone": "EST"}'::jsonb)
        RETURNING id
      `);
      const t2Id = t2Res.rows[0].id;

      // Teams for Tenant 1
      const teamRes = await client.query(`
        INSERT INTO teams (id, tenant_id, name)
        VALUES ('33333333-3333-3333-3333-333333333333', $1, 'Global Enterprise Sales')
        RETURNING id
      `, [t1Id]);
      const team1Id = teamRes.rows[0].id;

      // Users for Tenant 1
      await client.query(`
        INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, team_id, status)
        VALUES 
        ('44444444-4444-4444-4444-444444444441', $1, 'admin@scaloy.com', $2, 'Master', 'Admin', 'SUPER_ADMIN', $3, 'ACTIVE'),
        ('44444444-4444-4444-4444-444444444442', $1, 'owner@scaloy.com', $2, 'Karan', 'Shah', 'BUSINESS_OWNER', $3, 'ACTIVE'),
        ('44444444-4444-4444-4444-444444444443', $1, 'manager@scaloy.com', $2, 'Vikram', 'Mehta', 'SALES_MANAGER', $3, 'ACTIVE'),
        ('44444444-4444-4444-4444-444444444444', $1, 'sales@scaloy.com', $2, 'Ananya', 'Sharma', 'SALES_EXECUTIVE', $3, 'ACTIVE'),
        ('44444444-4444-4444-4444-444444444445', $1, 'marketing@scaloy.com', $2, 'Rohan', 'Verma', 'MARKETING_MANAGER', $3, 'ACTIVE')
      `, [t1Id, defaultPasswordHash, team1Id]);

      // Users for Tenant 2 (Apex Logistics)
      await client.query(`
        INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status)
        VALUES 
        ('55555555-5555-5555-5555-555555555551', $1, 'owner@apexlogistics.com', $2, 'Marcus', 'Vance', 'BUSINESS_OWNER', 'ACTIVE'),
        ('55555555-5555-5555-5555-555555555552', $1, 'rep@apexlogistics.com', $2, 'Elena', 'Rostova', 'SALES_EXECUTIVE', 'ACTIVE')
      `, [t2Id, defaultPasswordHash]);

      // Default Pipeline & Stages for Tenant 1
      const pipeRes = await client.query(`
        INSERT INTO pipelines (id, tenant_id, name, is_default)
        VALUES ('66666666-6666-6666-6666-666666666666', $1, 'B2B Enterprise Funnel', true)
        RETURNING id
      `, [t1Id]);
      const pipeId = pipeRes.rows[0].id;

      const stagesData = [
        { id: '77777777-7777-7777-7777-777777777771', name: 'New Leads', prob: 20, ord: 0, color: 'emerald' },
        { id: '77777777-7777-7777-7777-777777777772', name: 'Discovery Call', prob: 40, ord: 1, color: 'blue' },
        { id: '77777777-7777-7777-7777-777777777773', name: 'Qualified Fit', prob: 60, ord: 2, color: 'amber' },
        { id: '77777777-7777-7777-7777-777777777774', name: 'Proposal Sent', prob: 80, ord: 3, color: 'purple' },
        { id: '77777777-7777-7777-7777-777777777775', name: 'Closed Won', prob: 100, ord: 4, color: 'emerald' },
        { id: '77777777-7777-7777-7777-777777777776', name: 'Lost / Closed', prob: 0, ord: 5, color: 'slate' },
      ];

      for (const st of stagesData) {
        await client.query(`
          INSERT INTO pipeline_stages (id, tenant_id, pipeline_id, name, probability, order_index, color)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [st.id, t1Id, pipeId, st.name, st.prob, st.ord, st.color]);
      }

      // Seed Companies for Tenant 1
      await client.query(`
        INSERT INTO companies (id, tenant_id, name, domain, industry, size, phone, address)
        VALUES 
        ('88888888-8888-8888-8888-888888888881', $1, 'TechSurge Cloud Systems', 'techsurge.io', 'Software / SaaS', '50-200', '+1 (415) 890-1234', 'San Francisco, CA'),
        ('88888888-8888-8888-8888-888888888882', $1, 'Greenfield Manufacturing Corp', 'greenfieldind.com', 'Manufacturing', '500+', '+91 98250 88990', 'Ahmedabad, India'),
        ('88888888-8888-8888-8888-888888888883', $1, 'Nova Health Diagnostics', 'novahealth.org', 'Healthcare / Medical', '200-500', '+44 20 7946 0912', 'London, UK')
      `, [t1Id]);

      // Seed Contacts
      await client.query(`
        INSERT INTO contacts (id, tenant_id, company_id, first_name, last_name, email, phone, job_title)
        VALUES 
        ('99999999-9999-9999-9999-999999999991', $1, '88888888-8888-8888-8888-888888888881', 'Aarav', 'Patel', 'aarav@techsurge.io', '+1 (415) 890-1234', 'Chief Technology Officer'),
        ('99999999-9999-9999-9999-999999999992', $1, '88888888-8888-8888-8888-888888888882', 'Rajesh', 'Sharma', 'rajesh@greenfieldind.com', '+91 98250 88990', 'Managing Director'),
        ('99999999-9999-9999-9999-999999999993', $1, '88888888-8888-8888-8888-888888888883', 'Dr. Sarah', 'Jenkins', 'sjenkins@novahealth.org', '+44 20 7946 0912', 'VP of Operations')
      `, [t1Id]);

      // Seed Leads for Tenant 1
      await client.query(`
        INSERT INTO leads (id, tenant_id, first_name, last_name, email, phone, company_name, job_title, website, industry, company_size, source, status, score, budget, assigned_to_name, utm_source, utm_campaign)
        VALUES 
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', $1, 'Aarav', 'Patel', 'aarav@techsurge.io', '+1 (415) 890-1234', 'TechSurge Cloud Systems', 'Chief Technology Officer', 'https://techsurge.io', 'Software / SaaS', '50-200', 'LinkedIn Outreach', 'QUALIFIED', 92, 48000, 'Ananya Sharma', 'linkedin', 'q3_enterprise_saas'),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', $1, 'Rajesh', 'Sharma', 'rajesh@greenfieldind.com', '+91 98250 88990', 'Greenfield Industrial Corp', 'Managing Director', 'https://greenfieldind.com', 'Manufacturing', '500+', 'Google Search Ads', 'CONTACTED', 78, 65000, 'Ananya Sharma', 'google', 'b2b_automation'),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', $1, 'Sophia', 'Miller', 'smiller@apexlogistics.com', '+1 (555) 234-8901', 'Apex Global Logistics', 'VP of Procurement', 'https://apexlogistics.com', 'Logistics', '200-500', 'Website Inbound', 'PROPOSAL_SENT', 95, 52000, 'Vikram Mehta', 'direct', 'inbound_demo'),
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', $1, 'Elena', 'Rostova', 'elena@novafinance.eu', '+44 20 7946 0912', 'Nova Capital Partners', 'Head of Growth', 'https://novafinance.eu', 'Financial Services', '10-50', 'Referral', 'NEW', 68, 22000, 'Ananya Sharma', 'partner', 'fintech_referral')
      `, [t1Id]);

      // Seed Deals
      await client.query(`
        INSERT INTO deals (id, tenant_id, title, company_id, contact_id, pipeline_id, stage_id, amount, probability, expected_close_date, status)
        VALUES 
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', $1, 'TechSurge Enterprise Cloud Automation', '88888888-8888-8888-8888-888888888881', '99999999-9999-9999-9999-999999999991', $2, '77777777-7777-7777-7777-777777777773', 48000, 60, CURRENT_DATE + 30, 'OPEN'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', $1, 'Greenfield Factory ERP Integration', '88888888-8888-8888-8888-888888888882', '99999999-9999-9999-9999-999999999992', $2, '77777777-7777-7777-7777-777777777772', 65000, 40, CURRENT_DATE + 45, 'OPEN'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', $1, 'Apex Logistics Global Fleet License', NULL, NULL, $2, '77777777-7777-7777-7777-777777777774', 52000, 80, CURRENT_DATE + 14, 'OPEN')
      `, [t1Id, pipeId]);

      // Seed Products & Quotations
      await client.query(`
        INSERT INTO products (id, tenant_id, name, sku, price, tax_rate, description)
        VALUES 
        ('cccccccc-cccc-cccc-cccc-cccccccccccc', $1, 'LeadPulse B2B Enterprise License', 'LP-ENT-01', 35000, 18, 'Annual enterprise SaaS license with unlimited pipelines and custom AI lead scoring.'),
        ('cccccccc-cccc-cccc-cccc-cccccccccccd', $1, 'Automated Outreach Setup & Onboarding', 'LP-SRV-02', 8000, 18, 'Dedicated engineer setup, email deliverability warming, and CRM workflow design.')
      `, [t1Id]);

      // Seed Tasks & Follow-ups
      await client.query(`
        INSERT INTO tasks (id, tenant_id, title, description, priority, status, due_date, related_type, related_id)
        VALUES 
        ('dddddddd-dddd-dddd-dddd-ddddddddddd1', $1, 'Follow up with CTO Aarav Patel on pricing proposal', 'Review custom enterprise tier proposal sent yesterday', 'HIGH', 'TODO', CURRENT_DATE + 2, 'LEAD', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'),
        ('dddddddd-dddd-dddd-dddd-ddddddddddd2', $1, 'Schedule technical demo call with Greenfield MD', 'Prepare slides on plant automation and ERP sync', 'URGENT', 'IN_PROGRESS', CURRENT_DATE + 1, 'LEAD', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2')
      `, [t1Id]);

      console.log('✅ [Enterprise CRM] Multi-tenant seed data successfully populated in PostgreSQL!');
    }

    client.release();
  } catch (err) {
    console.warn('⚠️ [PostgreSQL]: ' + err.message);
    isConnected = false;
  }
}

module.exports = {
  pool,
  initDatabase,
  isPostgresConnected: () => isConnected,
  memoryStore
};
