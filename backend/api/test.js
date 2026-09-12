module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    success: true,
    status: 'healthy',
    platform: 'Enterprise CRM Backend API',
    timestamp: new Date().toISOString()
  });
};
