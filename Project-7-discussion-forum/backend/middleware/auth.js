const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access Denied. No token provided.' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
      req.user = decoded;
      
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges.' });
      }

      next();
    } catch (err) {
      res.status(400).json({ message: 'Invalid token.' });
    }
  };
};

module.exports = auth;