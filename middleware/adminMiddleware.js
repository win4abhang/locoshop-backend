// Middleware to restrict access to admin users only
const adminMiddleware = (req, res, next) => {
  // req.user should already be set by authMiddleware
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
};

module.exports = adminMiddleware;
