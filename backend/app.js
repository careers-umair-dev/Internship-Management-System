const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { clientUrl, isProd } = require('./config/env');
const { UPLOAD_DIR } = require('./middleware/upload');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Behind Vercel's proxy: needed so rate limiting sees the real client IP.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: clientUrl.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitize);
if (!isProd) app.use(morgan('dev'));

app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.use('/api', require('./routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
