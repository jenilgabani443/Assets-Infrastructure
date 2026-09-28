import dotenv from 'dotenv';
// Load environment variables immediately before importing local modules
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB, getDBStatus } from './config/db.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { sendSuccess } from './utils/apiResponse.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { initScheduler } from './jobs/scheduler.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security Headers
app.use(helmet());

// 2. CORS configuration with credentials support
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://assets-infrastructure-client.onrender.com',
  'https://assets-infrastructure.onrender.com'
];
if (CLIENT_URL) {
  allowedOrigins.push(CLIENT_URL.replace(/\/$/, ''));
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(origin.replace(/\/$/, '')) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /\.onrender\.com$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. HTTP Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 4. Request Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Rate Limiting
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// 6. Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  sendSuccess(res, 'Infrastructure Asset Inventory API is operational', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});

// 7. API Resource Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// 8. 404 Route Not Found Handler
app.use(notFoundHandler);

// 9. Central Error Handler
app.use(errorHandler);

// Connect to MongoDB and start listening
const startServer = async () => {
  try {
    await connectDB();
    // Initialize background jobs & scheduler
    initScheduler();
  } catch (err) {
    console.error('⚠️  Failed to complete initial database connection step:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Infrastructure Asset Inventory API Server`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔒 Allowed Client: ${CLIENT_URL}`);
    console.log(`==================================================\n`);
  });

  // Graceful shutdown handling
  const handleShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('🏁 HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return server;
};

// Start the server
startServer();

export default app;
