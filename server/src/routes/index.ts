import { Router } from 'express';
import authRoutes from './authRoutes.js';
import tripRoutes from './tripRoutes.js';
import contactRoutes from './contactRoutes.js';
import userRoutes from './userRoutes.js';
import destinationRoutes from './destinationRoutes.js';
import { getDBStatus } from '../config/db.js';

const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    service: 'safetrip-backend',
    app: 'SafeTrip API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/trips', tripRoutes);
apiRouter.use('/contacts', contactRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/destinations', destinationRoutes);

export default apiRouter;
