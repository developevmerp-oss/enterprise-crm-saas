const express = require('express');
const router = express.Router();
const { pool, isPostgresConnected } = require('../../db/init');

// GET /api/v1/analytics/dashboard - Tenant Executive Metrics
router.get('/dashboard', async (req, res) => {
  try {
    if (isPostgresConnected()) {
      // 1. Leads counts
      const leadsRes = await pool.query('SELECT score, status, budget, source FROM leads WHERE tenant_id = $1', [req.tenantId]);
      const leads = leadsRes.rows;

      const totalLeads = leads.length;
      const hotLeads = leads.filter(l => l.score >= 80).length;
      const totalBudget = leads.reduce((sum, l) => sum + Number(l.budget || 0), 0);

      // 2. Deals counts
      const dealsRes = await pool.query('SELECT amount, probability, status FROM deals WHERE tenant_id = $1', [req.tenantId]);
      const deals = dealsRes.rows;

      const totalPipelineValue = deals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const wonDeals = deals.filter(d => d.status === 'WON');
      const wonRevenue = wonDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const winRate = deals.length > 0 ? ((wonDeals.length / deals.length) * 100).toFixed(1) : '0';

      // 3. Companies & Contacts
      const compCountRes = await pool.query('SELECT COUNT(*) FROM companies WHERE tenant_id = $1', [req.tenantId]);
      const contactCountRes = await pool.query('SELECT COUNT(*) FROM contacts WHERE tenant_id = $1', [req.tenantId]);

      // 4. Pending Tasks
      const tasksRes = await pool.query('SELECT COUNT(*) FROM tasks WHERE tenant_id = $1 AND status != \'COMPLETED\'', [req.tenantId]);

      // 5. Source Attribution
      const sourceMap = {};
      leads.forEach(l => {
        const s = l.source || 'Other';
        sourceMap[s] = (sourceMap[s] || 0) + 1;
      });

      return res.json({
        success: true,
        data: {
          totalLeads,
          hotLeads,
          totalBudget,
          totalPipelineValue,
          wonRevenue,
          winRate,
          companiesCount: parseInt(compCountRes.rows[0].count, 10),
          contactsCount: parseInt(contactCountRes.rows[0].count, 10),
          pendingTasks: parseInt(tasksRes.rows[0].count, 10),
          sourceBreakdown: sourceMap
        }
      });
    }

    res.json({
      success: true,
      data: {
        totalLeads: 0,
        hotLeads: 0,
        totalPipelineValue: 0,
        wonRevenue: 0,
        winRate: '0',
        companiesCount: 0,
        contactsCount: 0,
        pendingTasks: 0,
        sourceBreakdown: {}
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
