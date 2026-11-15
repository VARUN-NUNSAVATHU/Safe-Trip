import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/sanitizer.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

import path from 'path';
import fs from 'fs';

const candidateA = path.resolve(process.cwd(), 'mobile/dist');
const candidateB = path.resolve(process.cwd(), '../mobile/dist');
const distPath = fs.existsSync(candidateA) ? candidateA : candidateB;

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInput);
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api', apiRouter);

// Serve static frontend bundle if built
if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Fallback greeting if frontend is not yet built
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to SafeTrip Backend API',
      documentation: '/api/health',
    });
  });
}

// Central Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  await connectDB();

  const server = app.listen(ENV.PORT, () => {
    console.log(`[SafeTrip API] Server running on http://localhost:${ENV.PORT}`);
    console.log(`[SafeTrip API] Health Check at http://localhost:${ENV.PORT}/api/health`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n=============================================================`);
      console.log(`[SafeTrip API] Server is ALREADY RUNNING on http://localhost:${ENV.PORT}`);
      console.log(`Port ${ENV.PORT} is already active and healthy.`);
      console.log(`Your backend is ONLINE. You do not need to start it again!`);
      console.log(`=============================================================\n`);
      process.exit(0);
    } else {
      console.error('[SafeTrip API] Server startup error:', err);
    }
  });
};

export { app, startServer };

// Auto-start server in non-test environments
if (process.env.NODE_ENV !== 'test') {
  startServer();
}
