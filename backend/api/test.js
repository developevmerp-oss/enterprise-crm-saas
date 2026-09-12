module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    success: true,
    status: 'healthy',
    platform: 'Enterprise CRM Backend API',
    env: {
      has_db: !!process.env.DATABASE_URL,
      has_smtp_user: !!process.env.SMTP_USER,
      smtp_user: process.env.SMTP_USER || 'MISSING',
      smtp_host: process.env.SMTP_HOST || 'MISSING',
      has_smtp_pass: !!process.env.SMTP_PASS
    },
    timestamp: new Date().toISOString()
  });
};
