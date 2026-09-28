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

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security Headers
app.use(helmet());

// 2. CORS configuration with credentials support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching CLIENT_URL
      if (!origin || origin === CLIENT_URL || origin === 'http://localhost:5173' || origin === 'http://localhost:3000') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
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

// 7. 404 Route Not Found Handler
app.use(notFoundHandler);

// 8. Central Error Handler
app.use(errorHandler);

// Connect to MongoDB and start listening
const startServer = async () => {
  try {
    await connectDB();
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
