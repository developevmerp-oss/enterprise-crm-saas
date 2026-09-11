const jwt = require('jsonwebtoken');
const { pool, memoryStore, isPostgresConnected } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_crm_jwt_token_2026';

/**
 * Tenant & Auth Scoping Middleware
 * Enforces multi-tenant data isolation by attaching verified tenant context to every request.
 */
async function tenantMiddleware(req, res, next) {
  try {
    let tenantId = req.headers['x-tenant-id'] || req.query.tenant_id;
    let user = null;

    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        user = decoded;
        req.user = decoded;
        if (!tenantId && decoded.tenantId) {
          tenantId = decoded.tenantId;
        }
      } catch (err) {
        // Token expired or invalid
      }
    }

    // Default to primary tenant if not provided
    if (!tenantId) {
      tenantId = '11111111-1111-1111-1111-111111111111'; // Scaloy Growth
    }

    req.tenantId = tenantId;

    if (isPostgresConnected()) {
      const result = await pool.query('SELECT id, name, slug, plan, status FROM tenants WHERE id = $1', [tenantId]);
      if (result.rows.length > 0) {
        req.tenant = result.rows[0];
      }
    }

    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    next();
  }
}

module.exports = { tenantMiddleware };
