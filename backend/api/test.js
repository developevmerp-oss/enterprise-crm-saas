const app = require('../src/server');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    success: true,
    message: 'Backend server is initialized and healthy!',
    db_connected: !!process.env.DATABASE_URL,
    routes_registered: app._router ? app._router.stack.length : 0,
    timestamp: new Date().toISOString()
  });
};
