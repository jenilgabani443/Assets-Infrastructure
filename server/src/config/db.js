import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

let retryCount = 0;
let isConnected = false;

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn('\n⚠️  [DATABASE WARNING] MONGO_URI is not defined in the environment variables.');
    console.warn('   The server will run in disconnected mode. Configure MONGO_URI in your .env file.\n');
    return null;
  }

  const attemptConnection = async () => {
    try {
      const conn = await mongoose.connect(mongoUri);
      isConnected = true;
      retryCount = 0;
      console.log(`✅ [MongoDB Connected] Host: ${conn.connection.host}, Database: ${conn.connection.name}`);
      return conn;
    } catch (error) {
      isConnected = false;
      retryCount += 1;
      console.error(`❌ [MongoDB Connection Error] Attempt ${retryCount}/${MAX_RETRIES} failed: ${error.message}`);

      if (retryCount < MAX_RETRIES) {
        console.log(`⏳ Retrying MongoDB connection in ${RETRY_INTERVAL_MS / 1000} seconds...`);
        setTimeout(attemptConnection, RETRY_INTERVAL_MS);
      } else {
        console.error('🚨 [MongoDB Error] Maximum connection retry attempts reached. Proceeding without active DB connection.');
      }
    }
  };

  // Connection listeners
  mongoose.connection.on('disconnected', () => {
    if (isConnected) {
      console.warn('⚠️  [MongoDB] Lost connection to database.');
      isConnected = false;
    }
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 [MongoDB] Reconnected to database.');
    isConnected = true;
  });

  return attemptConnection();
};

export const getDBStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    connected: stateCode === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
};

export default connectDB;
