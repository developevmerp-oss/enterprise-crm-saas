const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, isPostgresConnected } = require('../../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_crm_jwt_token_2026';

// POST /api/v1/auth/login - Real User Authentication
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT u.*, t.name as tenant_name, t.plan as tenant_plan, t.status as tenant_status
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE LOWER(u.email) = LOWER($1)
      `, [email.trim()]);

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials: User account not found.'
        });
      }

      const user = result.rows[0];

      // Verify bcrypt password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials: Password incorrect.'
        });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'Your account is deactivated. Please contact your administrator.'
        });
      }

      // Generate secure JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenant_id,
          name: `${user.first_name} ${user.last_name || ''}`.trim()
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Log successful login audit activity
      if (user.tenant_id) {
        await pool.query(`
          INSERT INTO audit_logs (tenant_id, user_id, user_name, action, module, details)
          VALUES ($1, $2, $3, 'USER_LOGIN', 'AUTH', $4)
        `, [
          user.tenant_id,
          user.id,
          `${user.first_name} ${user.last_name || ''}`.trim(),
          JSON.stringify({ role: user.role, ip: req.ip })
        ]);
      }

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name || '',
          role: user.role,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name || 'Global Workspace',
          tenant_plan: user.tenant_plan || 'Enterprise'
        }
      });
    }

    res.status(500).json({ success: false, error: 'Database offline' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/auth/me - Verify current session
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isPostgresConnected()) {
      const result = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.tenant_id,
               t.name as tenant_name, t.plan as tenant_plan
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1
      `, [decoded.userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User session expired' });
      }

      return res.json({ success: true, user: result.rows[0] });
    }

    res.json({ success: true, user: decoded });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

module.exports = router;
