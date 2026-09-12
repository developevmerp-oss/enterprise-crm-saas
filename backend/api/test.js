module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    message: 'Vercel Serverless Function is ALIVE from backend/api/test.js',
    has_db: !!process.env.DATABASE_URL,
    db_prefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 16) + '...' : 'none',
    node_version: process.version,
    timestamp: new Date().toISOString()
  });
};
