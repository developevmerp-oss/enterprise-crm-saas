const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/contacts - List contacts
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT c.*, comp.name as company_name 
        FROM contacts c
        LEFT JOIN companies comp ON c.company_id = comp.id
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

// POST /api/v1/contacts - Create contact
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE']), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, job_title, company_id } = req.body;
    if (!first_name) return res.status(400).json({ success: false, error: 'First Name is required.' });

    if (isPostgresConnected()) {
      const result = await pool.query(`
        INSERT INTO contacts (tenant_id, company_id, first_name, last_name, email, phone, job_title)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [req.tenantId, company_id || null, first_name, last_name || '', email || '', phone || '', job_title || '']);
      return res.status(201).json({ success: true, data: result.rows[0] });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
