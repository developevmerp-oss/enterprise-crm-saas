const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/deals/pipelines - Get pipelines and stages for tenant
router.get('/pipelines', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const pipeRes = await pool.query('SELECT * FROM pipelines WHERE tenant_id = $1 ORDER BY created_at ASC', [req.tenantId]);
      const stagesRes = await pool.query('SELECT * FROM pipeline_stages WHERE tenant_id = $1 ORDER BY order_index ASC', [req.tenantId]);

      const pipelines = pipeRes.rows.map(pipe => ({
        ...pipe,
        stages: stagesRes.rows.filter(s => s.pipeline_id === pipe.id)
      }));

      return res.json({ success: true, data: pipelines });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/deals - List deals with stage and company details
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT d.*, 
          c.name as company_name, 
          ct.first_name as contact_first_name, ct.last_name as contact_last_name,
          s.name as stage_name, s.color as stage_color
        FROM deals d
        LEFT JOIN companies c ON d.company_id = c.id
        LEFT JOIN contacts ct ON d.contact_id = ct.id
        LEFT JOIN pipeline_stages s ON d.stage_id = s.id
        WHERE d.tenant_id = $1
        ORDER BY d.created_at DESC
      `, [req.tenantId]);
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/deals - Create new deal / opportunity
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE']), async (req, res) => {
  try {
    const { title, company_id, contact_id, pipeline_id, stage_id, amount, probability, expected_close_date } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Deal title is required.' });

    if (isPostgresConnected()) {
      // Find default stage if not passed
      let stage = stage_id;
      let pipe = pipeline_id;

      if (!pipe) {
        const p = await pool.query('SELECT id FROM pipelines WHERE tenant_id = $1 LIMIT 1', [req.tenantId]);
        pipe = p.rows[0]?.id;
      }
      if (!stage && pipe) {
        const s = await pool.query('SELECT id FROM pipeline_stages WHERE tenant_id = $1 AND pipeline_id = $2 ORDER BY order_index ASC LIMIT 1', [req.tenantId, pipe]);
        stage = s.rows[0]?.id;
      }

      const result = await pool.query(`
        INSERT INTO deals (tenant_id, title, company_id, contact_id, pipeline_id, stage_id, amount, probability, expected_close_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN')
        RETURNING *
      `, [req.tenantId, title, company_id || null, contact_id || null, pipe, stage, amount ? Number(amount) : 0, probability ? Number(probability) : 50, expected_close_date || null]);

      const newDeal = result.rows[0];

      await pool.query(`
        INSERT INTO activities (tenant_id, type, description, related_type, related_id)
        VALUES ($1, 'DEAL_CREATED', $2, 'DEAL', $3)
      `, [req.tenantId, `Opportunity created: "${title}" valued at $${Number(amount || 0).toLocaleString()}`, newDeal.id]);

      return res.status(201).json({ success: true, data: newDeal });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/deals/:id/stage - Move deal stage in Kanban
router.patch('/:id/stage', async (req, res) => {
  try {
    const { stage_id, status } = req.body;
    if (isPostgresConnected()) {
      const dealRes = await pool.query(`
        UPDATE deals SET 
          stage_id = COALESCE($1, stage_id),
          status = COALESCE($2, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND tenant_id = $4
        RETURNING *
      `, [stage_id, status, req.params.id, req.tenantId]);

      if (dealRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Deal not found' });

      return res.json({ success: true, data: dealRes.rows[0] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
