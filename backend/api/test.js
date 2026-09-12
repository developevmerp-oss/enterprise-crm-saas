let app;
let loadError = null;
try {
  app = require('../src/server');
} catch (e) {
  loadError = {
    message: e.message,
    stack: e.stack
  };
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (loadError) {
    return res.status(500).json({
      success: false,
      loadError
    });
  }
  return res.status(200).json({
    success: true,
    appLoaded: typeof app === 'function',
    routesCount: app._router ? app._router.stack.length : 0
  });
};
