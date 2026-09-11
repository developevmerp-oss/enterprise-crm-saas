const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/companies - List companies for tenant
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contact_count,
          (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deal_count
        FROM companies c 
        WHERE c.tenant_id = $1 
        ORDER BY c.created_at DESC
      `, [req.tenantId]);
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/companies - Create company
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE']), async (req, res) => {
  try {
    const { name, domain, industry, size, phone, address } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Company Name is required.' });

    if (isPostgresConnected()) {
      const result = await pool.query(`
        INSERT INTO companies (tenant_id, name, domain, industry, size, phone, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [req.tenantId, name, domain || '', industry || 'Software / SaaS', size || '50-200', phone || '', address || '']);
      return res.status(201).json({ success: true, data: result.rows[0] });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/companies/:id - Company detail with contacts and deals
router.get('/:id', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const compRes = await pool.query('SELECT * FROM companies WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
      if (compRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Company not found' });

      const contactsRes = await pool.query('SELECT * FROM contacts WHERE company_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
      const dealsRes = await pool.query('SELECT * FROM deals WHERE company_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);

      return res.json({
        success: true,
        data: {
          ...compRes.rows[0],
          contacts: contactsRes.rows,
          deals: dealsRes.rows
        }
      });
    }
    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
