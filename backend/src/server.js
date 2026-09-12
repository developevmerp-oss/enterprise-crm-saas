require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/init');
const { tenantMiddleware } = require('./middleware/tenant');

// Import Module Routers
const authRouter = require('./modules/auth/routes');
const tenantsRouter = require('./modules/tenants/routes');
const leadsRouter = require('./modules/leads/routes');
const companiesRouter = require('./modules/companies/routes');
const contactsRouter = require('./modules/contacts/routes');
const dealsRouter = require('./modules/deals/routes');
const tasksRouter = require('./modules/tasks/routes');
const quotationsRouter = require('./modules/quotations/routes');
const analyticsRouter = require('./modules/analytics/routes');
const usersRouter = require('./modules/users/routes');
const emailsRouter = require('./modules/emails/routes');

const app = express();
const PORT = process.env.PORT || 5060;

// Core Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-user-role']
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Multi-Tenant Scoping Middleware to all API requests
app.use('/api/v1', tenantMiddleware);

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] [Tenant: ${req.tenantId || 'GLOBAL'}] ${req.method} ${req.url}`);
  next();
});

// Root & Health checks
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Enterprise Multi-Tenant CRM SaaS API',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Enterprise Multi-Tenant CRM SaaS API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Register REST v1 Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tenants', tenantsRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/contacts', contactsRouter);
app.use('/api/v1/deals', dealsRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/quotations', quotationsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/emails', emailsRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Boot API Server with Gmail SMTP
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 [Enterprise CRM SaaS] API listening on http://localhost:${PORT}`);
    console.log(`📡 Inbound Lead Webhook endpoint: http://localhost:${PORT}/api/v1/leads/webhook`);
  });
}

// In standard Node.js, boot the server
if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
