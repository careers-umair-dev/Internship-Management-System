// Vercel serverless entry point. Locally the API still starts through server.js.
// The DB connection is cached across warm invocations; the cron scheduler is not
// started here because serverless functions do not stay running.
const app = require('../app');
const connectDB = require('../config/db');

let connecting;

module.exports = async (req, res) => {
  try {
    connecting = connecting || connectDB();
    await connecting;
  } catch (err) {
    connecting = null;
    console.error('MongoDB connection failed:', err.message);
    return res.status(500).json({ success: false, message: 'Database connection failed' });
  }
  return app(req, res);
};
