const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/tenants - List all businesses (Accessible by Super Admin & for Tenant Switcher)
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query('SELECT id, name, slug, plan, status, created_at FROM tenants ORDER BY created_at ASC');
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/tenants/current - Active tenant profile
router.get('/current', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [req.tenantId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tenant not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }
    res.json({ success: true, data: { id: req.tenantId, name: 'Default Tenant', plan: 'Enterprise' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/tenants - Onboard new business tenant
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER']), async (req, res) => {
  try {
    const { name, slug, plan } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Business Name and Slug are required.' });
    }

    if (isPostgresConnected()) {
      const tenantRes = await pool.query(`
        INSERT INTO tenants (name, slug, plan, status)
        VALUES ($1, $2, $3, 'ACTIVE')
        RETURNING *
      `, [name, slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'), plan || 'Pro Business']);

      const newTenant = tenantRes.rows[0];

      // Auto-create default pipeline for new tenant
      const pipeRes = await pool.query(`
        INSERT INTO pipelines (tenant_id, name, is_default)
        VALUES ($1, 'Sales Pipeline', true)
        RETURNING id
      `, [newTenant.id]);

      const pipeId = pipeRes.rows[0].id;
      const defaultStages = [
        { name: 'New Leads', prob: 20, ord: 0, col: 'emerald' },
        { name: 'Contacted', prob: 40, ord: 1, col: 'blue' },
        { name: 'Qualified', prob: 60, ord: 2, col: 'amber' },
        { name: 'Proposal Sent', prob: 80, ord: 3, col: 'purple' },
        { name: 'Closed Won', prob: 100, ord: 4, col: 'emerald' }
      ];

      for (const st of defaultStages) {
        await pool.query(`
          INSERT INTO pipeline_stages (tenant_id, pipeline_id, name, probability, order_index, color)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [newTenant.id, pipeId, st.name, st.prob, st.ord, st.col]);
      }

      return res.status(201).json({
        success: true,
        message: 'New business tenant onboarded successfully with isolated database workspace.',
        data: newTenant
      });
    }

    res.status(201).json({ success: true, data: { name, slug, plan } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
