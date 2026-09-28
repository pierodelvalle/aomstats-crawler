import { API_KEY } from '../config/index.js';

// Middleware to validate API key
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      code: 401,
      message: 'Unauthorized: Invalid or missing API key'
    });
  }

  next();
};

export default validateApiKey;