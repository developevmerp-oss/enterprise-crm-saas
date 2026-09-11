const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/users - List users for tenant
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.created_at, t.name as team_name
        FROM users u
        LEFT JOIN teams t ON u.team_id = t.id
        WHERE u.tenant_id = $1
        ORDER BY u.created_at ASC
      `, [req.tenantId]);
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/users - Add user to tenant with specific role
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER']), async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;
    if (!email || !first_name) {
      return res.status(400).json({ success: false, error: 'Email and First Name are required.' });
    }

    if (isPostgresConnected()) {
      const passHash = await bcrypt.hash(password || 'password123', 10);
      const result = await pool.query(`
        INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
        RETURNING id, email, first_name, last_name, role, status, created_at
      `, [req.tenantId, email, passHash, first_name, last_name || '', role || 'SALES_EXECUTIVE']);

      return res.status(201).json({ success: true, data: result.rows[0] });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
