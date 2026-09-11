const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');
const { requireRoles } = require('../../middleware/rbac');

// GET /api/v1/quotations/products - List product catalog
router.get('/products', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query('SELECT * FROM products WHERE tenant_id = $1 ORDER BY created_at DESC', [req.tenantId]);
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/quotations/products - Add product
router.post('/products', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER']), async (req, res) => {
  try {
    const { name, sku, price, tax_rate, description } = req.body;
    if (!name || price === undefined) return res.status(400).json({ success: false, error: 'Product Name and Price are required.' });

    if (isPostgresConnected()) {
      const result = await pool.query(`
        INSERT INTO products (tenant_id, name, sku, price, tax_rate, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [req.tenantId, name, sku || '', Number(price), tax_rate ? Number(tax_rate) : 18, description || '']);
      return res.status(201).json({ success: true, data: result.rows[0] });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/quotations - List quotations
router.get('/', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT q.*, d.title as deal_title, c.name as company_name
        FROM quotations q
        LEFT JOIN deals d ON q.deal_id = d.id
        LEFT JOIN companies c ON d.company_id = c.id
        WHERE q.tenant_id = $1
        ORDER BY q.created_at DESC
      `, [req.tenantId]);
      return res.json({ success: true, data: result.rows });
    }
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/quotations - Create quotation
router.post('/', requireRoles(['SUPER_ADMIN', 'BUSINESS_OWNER', 'SALES_MANAGER', 'SALES_EXECUTIVE']), async (req, res) => {
  try {
    const { deal_id, quote_number, total_amount, items, valid_until } = req.body;
    const qNum = quote_number || `QT-${Date.now().toString().slice(-6)}`;

    if (isPostgresConnected()) {
      const result = await pool.query(`
        INSERT INTO quotations (tenant_id, deal_id, quote_number, total_amount, items, valid_until, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
        RETURNING *
      `, [req.tenantId, deal_id || null, qNum, Number(total_amount || 0), JSON.stringify(items || []), valid_until || null]);

      return res.status(201).json({ success: true, data: result.rows[0] });
    }
    res.status(201).json({ success: true, data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
