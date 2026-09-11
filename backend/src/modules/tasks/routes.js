const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/tasks - List tasks for tenant
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT t.*, u.first_name as assignee_first_name, u.last_name as assignee_last_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.tenant_id = $1
        ORDER BY t.due_date ASC, t.created_at DESC
      `, [req.tenantId]);
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/tasks - Create task / follow-up
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, due_date, related_type, related_id, assigned_to } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Task title is required.' });

    if (isPostgresConnected()) {
      const result = await pool.query(`
        INSERT INTO tasks (tenant_id, title, description, priority, due_date, related_type, related_id, assigned_to, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'TODO')
        RETURNING *
      `, [req.tenantId, title, description || '', priority || 'MEDIUM', due_date || null, related_type || null, related_id || null, assigned_to || null]);

      return res.status(201).json({ success: true, data: result.rows[0] });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/tasks/:id/status - Update task status (TODO <-> COMPLETED)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (isPostgresConnected()) {
      const result = await pool.query(`
        UPDATE tasks SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *
      `, [status, req.params.id, req.tenantId]);
      return res.json({ success: true, data: result.rows[0] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
