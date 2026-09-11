/**
 * Role-Based Access Control (RBAC) System
 * Roles: SUPER_ADMIN, BUSINESS_OWNER, SALES_MANAGER, SALES_EXECUTIVE, MARKETING_MANAGER, VIEWER
 */

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['ALL'],
  BUSINESS_OWNER: [
    'LEAD_VIEW', 'LEAD_CREATE', 'LEAD_EDIT', 'LEAD_DELETE', 'LEAD_ASSIGN', 'LEAD_EXPORT',
    'DEAL_VIEW', 'DEAL_CREATE', 'DEAL_EDIT', 'DEAL_DELETE',
    'COMPANY_VIEW', 'COMPANY_CREATE', 'COMPANY_EDIT', 'COMPANY_DELETE',
    'CONTACT_VIEW', 'CONTACT_CREATE', 'CONTACT_EDIT', 'CONTACT_DELETE',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE',
    'QUOTE_VIEW', 'QUOTE_CREATE', 'QUOTE_EDIT', 'QUOTE_DELETE',
    'TEAM_MANAGE', 'SETTINGS_MANAGE'
  ],
  SALES_MANAGER: [
    'LEAD_VIEW', 'LEAD_CREATE', 'LEAD_EDIT', 'LEAD_DELETE', 'LEAD_ASSIGN',
    'DEAL_VIEW', 'DEAL_CREATE', 'DEAL_EDIT', 'DEAL_DELETE',
    'COMPANY_VIEW', 'COMPANY_CREATE', 'COMPANY_EDIT',
    'CONTACT_VIEW', 'CONTACT_CREATE', 'CONTACT_EDIT',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE',
    'QUOTE_VIEW', 'QUOTE_CREATE', 'QUOTE_EDIT',
    'TEAM_VIEW'
  ],
  SALES_EXECUTIVE: [
    'LEAD_VIEW', 'LEAD_CREATE', 'LEAD_EDIT',
    'DEAL_VIEW', 'DEAL_CREATE', 'DEAL_EDIT',
    'COMPANY_VIEW', 'COMPANY_CREATE', 'COMPANY_EDIT',
    'CONTACT_VIEW', 'CONTACT_CREATE', 'CONTACT_EDIT',
    'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT',
    'QUOTE_VIEW', 'QUOTE_CREATE'
  ],
  MARKETING_MANAGER: [
    'LEAD_VIEW', 'LEAD_CREATE', 'LEAD_EDIT', 'LEAD_EXPORT', 'LEAD_IMPORT',
    'CAMPAIGN_MANAGE', 'FORM_MANAGE', 'ANALYTICS_VIEW'
  ],
  VIEWER: [
    'LEAD_VIEW', 'DEAL_VIEW', 'COMPANY_VIEW', 'CONTACT_VIEW', 'TASK_VIEW', 'QUOTE_VIEW'
  ]
};

function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    // Current user role from header, auth token, or fallback to BUSINESS_OWNER for dev
    const userRole = req.headers['x-user-role'] || (req.user && req.user.role) || 'BUSINESS_OWNER';
    req.userRole = userRole;

    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access Denied: Your role '${userRole}' is not authorized to perform this operation.`
    });
  };
}

module.exports = {
  ROLE_PERMISSIONS,
  requireRoles
};
