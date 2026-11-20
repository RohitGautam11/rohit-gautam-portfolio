/** GET /api/health: simple liveness check for the portfolio API. */
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Only GET is supported.' });
  }
  return res.status(200).json({
    status: 'ok',
    service: 'rohit-gautam-portfolio-api',
    runtime: `Node.js ${process.version}`,
    region: process.env.VERCEL_REGION || 'local',
    endpoints: ['GET /api/health', 'POST /api/inventory/receive'],
    time: new Date().toISOString(),
  });
};
