const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');
const os = require('os');
const path = require('path');
const uploadDir = path.join(os.tmpdir(), 'crm-uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  // Ignored in restricted environments
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  })
});

// Lead Scoring Utility
function calculateScore(lead) {
  let score = 20;
  const title = (lead.job_title || '').toLowerCase();
  if (['ceo', 'founder', 'cto', 'cfo', 'vp', 'director', 'head', 'owner'].some(kw => title.includes(kw))) {
    score += 35;
  } else if (title.includes('manager') || title.includes('lead')) {
    score += 20;
  }

  const emailDomain = (lead.email.split('@')[1] || '').toLowerCase();
  if (emailDomain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(emailDomain)) {
    score += 15;
  }

  if (['50-200', '200-500', '500+'].includes(lead.company_size)) {
    score += 15;
  }

  const budget = Number(lead.budget || 0);
  if (budget >= 50000) score += 15;
  else if (budget >= 20000) score += 10;

  return Math.min(Math.max(score, 10), 99);
}

// GET /api/v1/leads - List leads scoped to tenant
router.get('/', async (req, res) => {
  try {
    const { search, status, source, tier } = req.query;
    if (isPostgresConnected()) {
      let query = 'SELECT * FROM leads WHERE tenant_id = $1';
      const params = [req.tenantId];

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(first_name) LIKE $${params.length} OR LOWER(last_name) LIKE $${params.length} OR LOWER(company_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(job_title) LIKE $${params.length})`;
      }
      if (status && status !== 'all') {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      if (source && source !== 'all') {
        params.push(source);
        query += ` AND source = $${params.length}`;
      }
      if (tier === 'hot') {
        query += ` AND score >= 80`;
      } else if (tier === 'warm') {
        query += ` AND score >= 50 AND score < 80`;
      } else if (tier === 'cold') {
        query += ` AND score < 50`;
      }

      query += ' ORDER BY created_at DESC';
      const result = await pool.query(query, params);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }
    res.json({ success: true, count: 0, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/leads - Create lead with duplicate check and auto scoring
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'MARKETING_MANAGER']), async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, company_name, job_title,
      website, industry, company_size, source, status, budget, utm_source, utm_campaign
    } = req.body;

    if (!first_name || !company_name || !email) {
      return res.status(400).json({ success: false, error: 'First Name, Company, and Email are required.' });
    }

    if (isPostgresConnected()) {
      // Duplicate detection within tenant
      const dupeCheck = await pool.query(
        'SELECT id, first_name, company_name FROM leads WHERE tenant_id = $1 AND (LOWER(email) = LOWER($2) OR (phone IS NOT NULL AND phone != \'\' AND phone = $3))',
        [req.tenantId, email, phone || '']
      );

      if (dupeCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: `Duplicate prospect detected: A lead with this email or phone already exists (${dupeCheck.rows[0].first_name} at ${dupeCheck.rows[0].company_name}).`,
          existingLeadId: dupeCheck.rows[0].id
        });
      }

      const score = calculateScore(req.body);

      // Lead Routing: Automatically assign to an available sales executive in this tenant
      let assignedUser = null;
      let assignedName = 'Sales Team';
      const usersRes = await pool.query(
        'SELECT id, first_name, last_name FROM users WHERE tenant_id = $1 AND role IN (\'SALES_EXECUTIVE\', \'SALES_MANAGER\') LIMIT 1',
        [req.tenantId]
      );
      if (usersRes.rows.length > 0) {
        assignedUser = usersRes.rows[0].id;
        assignedName = `${usersRes.rows[0].first_name} ${usersRes.rows[0].last_name || ''}`.trim();
      }

      const result = await pool.query(`
        INSERT INTO leads (
          tenant_id, first_name, last_name, email, phone, company_name,
          job_title, website, industry, company_size, source, status,
          score, budget, assigned_to, assigned_to_name, utm_source, utm_campaign
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `, [
        req.tenantId, first_name, last_name || '', email, phone || '', company_name,
        job_title || '', website || '', industry || 'Software / SaaS', company_size || '50-200',
        source || 'Manual Entry', status || 'NEW', score, budget ? Number(budget) : 0,
        assignedUser, assignedName, utm_source || 'direct', utm_campaign || ''
      ]);

      const newLead = result.rows[0];

      // Auto-log activity
      await pool.query(`
        INSERT INTO activities (tenant_id, type, description, related_type, related_id)
        VALUES ($1, 'CREATED', $2, 'LEAD', $3)
      `, [req.tenantId, `Lead created with Fit Score ${score}/100. Assigned to ${assignedName}.`, newLead.id]);

      return res.status(201).json({ success: true, data: newLead });
    }

    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/leads/:id/stage - Update status
router.patch('/:id/stage', async (req, res) => {
  try {
    const { status } = req.body;
    if (isPostgresConnected()) {
      const result = await pool.query(
        'UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3 RETURNING *',
        [status, req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });

      await pool.query(`
        INSERT INTO activities (tenant_id, type, description, related_type, related_id)
        VALUES ($1, 'STAGE_CHANGE', $2, 'LEAD', $3)
      `, [req.tenantId, `Lead status advanced to ${status}.`, req.params.id]);

      return res.json({ success: true, data: result.rows[0] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/leads/:id/assign - Assign lead to sales team member
router.patch('/:id/assign', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER']), async (req, res) => {
  try {
    const { user_id, user_name } = req.body;
    if (isPostgresConnected()) {
      const result = await pool.query(
        'UPDATE leads SET assigned_to = $1, assigned_to_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND tenant_id = $4 RETURNING *',
        [user_id || null, user_name || 'Unassigned', req.params.id, req.tenantId]
      );
      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });

      await pool.query(`
        INSERT INTO activities (tenant_id, type, description, related_type, related_id)
        VALUES ($1, 'LEAD_ASSIGNED', $2, 'LEAD', $3)
      `, [req.tenantId, `Lead assigned to ${user_name || 'rep'}.`, req.params.id]);

      return res.json({ success: true, data: result.rows[0] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/leads/:id/convert - Convert qualified lead to B2B Company, Contact & Deal
router.post('/:id/convert', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE']), async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
      if (leadRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });
      const lead = leadRes.rows[0];

      // 1. Find or create company
      let companyId;
      const compCheck = await pool.query('SELECT id FROM companies WHERE tenant_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1', [req.tenantId, lead.company_name]);
      if (compCheck.rows.length > 0) {
        companyId = compCheck.rows[0].id;
      } else {
        const compCreate = await pool.query(`
          INSERT INTO companies (tenant_id, name, domain, industry, size)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [req.tenantId, lead.company_name, lead.website || '', lead.industry || 'B2B', lead.company_size || '50-200']);
        companyId = compCreate.rows[0].id;
      }

      // 2. Find or create decision maker contact
      let contactId;
      const contCheck = await pool.query('SELECT id FROM contacts WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1', [req.tenantId, lead.email]);
      if (contCheck.rows.length > 0) {
        contactId = contCheck.rows[0].id;
      } else {
        const contCreate = await pool.query(`
          INSERT INTO contacts (tenant_id, company_id, first_name, last_name, email, phone, job_title)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [req.tenantId, companyId, lead.first_name, lead.last_name || '', lead.email, lead.phone || '', lead.job_title || 'Decision Maker']);
        contactId = contCreate.rows[0].id;
      }

      // 3. Find default pipeline and stage
      const pipeRes = await pool.query('SELECT id FROM pipelines WHERE tenant_id = $1 LIMIT 1', [req.tenantId]);
      const pipelineId = pipeRes.rows[0]?.id;
      const stageRes = await pool.query('SELECT id FROM pipeline_stages WHERE tenant_id = $1 AND pipeline_id = $2 ORDER BY order_index ASC LIMIT 1', [req.tenantId, pipelineId]);
      const stageId = stageRes.rows[0]?.id;

      // 4. Create opportunity / deal
      const dealRes = await pool.query(`
        INSERT INTO deals (tenant_id, title, company_id, contact_id, pipeline_id, stage_id, amount, probability, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 60, 'OPEN')
        RETURNING *
      `, [req.tenantId, `${lead.company_name} - Growth Solution`, companyId, contactId, pipelineId, stageId, Number(lead.budget || 25000)]);
      const newDeal = dealRes.rows[0];

      // 5. Update lead status to CONVERTED
      await pool.query('UPDATE leads SET status = \'CONVERTED\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [lead.id]);

      // 6. Log activity
      await pool.query(`
        INSERT INTO activities (tenant_id, type, description, related_type, related_id)
        VALUES ($1, 'LEAD_CONVERTED', $2, 'DEAL', $3)
      `, [req.tenantId, `Lead ${lead.first_name} (${lead.company_name}) successfully converted into Sales Deal "${newDeal.title}".`, newDeal.id]);

      return res.json({
        success: true,
        message: 'Lead successfully converted to B2B Company, Contact & Deal Opportunity!',
        data: { deal: newDeal, company_id: companyId, contact_id: contactId }
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/leads/:id - Delete lead (RBAC protected: Only Owner & Managers)
router.delete('/:id', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER']), async (req, res) => {
  try {
    if (isPostgresConnected()) {
      await pool.query('DELETE FROM leads WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
      return res.json({ success: true, message: 'Lead deleted successfully' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/leads/webhook - Inbound Webhook for landing pages & ad forms
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const email = payload.email || payload.workEmail;
    const company = payload.company || payload.company_name || 'Inbound Enterprise';

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing email in webhook payload' });
    }

    const leadPayload = {
      first_name: payload.first_name || payload.firstName || payload.name?.split(' ')[0] || 'Inbound Prospect',
      last_name: payload.last_name || payload.lastName || '',
      email,
      phone: payload.phone || '',
      company_name: company,
      job_title: payload.job_title || payload.title || 'Decision Maker',
      website: payload.website || '',
      industry: payload.industry || 'B2B',
      company_size: payload.company_size || '50-200',
      source: payload.source || 'Website Landing Page Webhook',
      budget: payload.budget ? Number(payload.budget) : 25000,
      utm_source: payload.utm_source || 'meta_ads',
      utm_campaign: payload.utm_campaign || 'q3_lead_gen'
    };

    const score = calculateScore(leadPayload);

    if (isPostgresConnected()) {
      const result = await pool.query(`
        INSERT INTO leads (
          tenant_id, first_name, last_name, email, phone, company_name,
          job_title, website, industry, company_size, source, status,
          score, budget, assigned_to_name, utm_source, utm_campaign
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NEW',
          $12, $13, 'Automated Routing Queue', $14, $15
        ) RETURNING *
      `, [
        req.tenantId, leadPayload.first_name, leadPayload.last_name, email, leadPayload.phone,
        company, leadPayload.job_title, leadPayload.website, leadPayload.industry, leadPayload.company_size,
        leadPayload.source, score, leadPayload.budget, leadPayload.utm_source, leadPayload.utm_campaign
      ]);

      const created = result.rows[0];
      return res.status(201).json({
        success: true,
        message: 'Lead captured and scored via Inbound Webhook',
        data: created
      });
    }

    res.status(201).json({ success: true, data: leadPayload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/leads/import - Bulk CSV Importer
router.post('/import', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'MARKETING_MANAGER']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'CSV file required' });

  const rows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (d) => rows.push(d))
    .on('end', async () => {
      try {
        fs.unlinkSync(req.file.path);
        let imported = 0;
        let duplicates = 0;

        for (const row of rows) {
          const email = row.email || row['Email'] || row['Work Email'];
          const company = row.company || row['Company'] || row['Company Name'] || 'B2B Client';
          const firstName = row.first_name || row['First Name'] || row.name || 'Prospect';

          if (email && company && isPostgresConnected()) {
            // Check duplicate
            const exist = await pool.query('SELECT id FROM leads WHERE tenant_id = $1 AND email = $2', [req.tenantId, email]);
            if (exist.rows.length > 0) {
              duplicates++;
              continue;
            }

            const score = calculateScore({
              job_title: row.job_title || row['Job Title'] || '',
              email,
              company_size: row.company_size || row['Company Size'] || '50-200',
              budget: row.budget || row['Deal Value'] || 20000
            });

            await pool.query(`
              INSERT INTO leads (
                tenant_id, first_name, last_name, email, phone, company_name,
                job_title, website, industry, company_size, source, status, score, budget
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NEW', $12, $13)
            `, [
              req.tenantId, firstName, row.last_name || row['Last Name'] || '', email,
              row.phone || row['Phone'] || '', company, row.job_title || row['Job Title'] || '',
              row.website || row['Website'] || '', row.industry || row['Industry'] || 'Software / SaaS',
              row.company_size || row['Company Size'] || '50-200', 'CSV Bulk Import', score,
              Number(row.budget || row['Deal Value'] || 15000)
            ]);
            imported++;
          }
        }

        res.json({
          success: true,
          message: `Imported ${imported} leads successfully (${duplicates} duplicate records skipped).`,
          imported,
          duplicates
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
});

module.exports = router;
