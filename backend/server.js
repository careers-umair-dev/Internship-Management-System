const { port } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const { startScheduler } = require('./services/scheduler');

const start = async () => {
  await connectDB();
  startScheduler();
  const server = app.listen(port, () => console.log(`API running on http://localhost:${port}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
