require('dotenv').config();

// Environment Configuration
const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dfashion',
    atlasUri: process.env.MONGO_ATLAS_URI,
    name: process.env.DB_NAME || 'dfashion',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_key_for_development',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Admin Security
  admin: {
    sessionTimeout: process.env.ADMIN_SESSION_TIMEOUT || '8h',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    accountLockTime: process.env.ACCOUNT_LOCK_TIME || '30m'
  },

  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    rateLimit: parseInt(process.env.API_RATE_LIMIT) || 100,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200'
  },

  // File Upload Configuration
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || '5MB',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },

  // External Services
  external: {
    ngrokToken: process.env.NGROK_AUTHTOKEN
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'DFashion <noreply@dfashion.com>'
  },

  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // Frontend URLs
  frontend: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
    mobileUrl: process.env.MOBILE_URL || 'http://localhost:8100'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // Security Configuration
  security: {
    helmet: process.env.HELMET_ENABLED === 'true',
    rateLimit: process.env.RATE_LIMIT_ENABLED === 'true',
    cors: process.env.CORS_ENABLED === 'true'
  },

  // Feature Flags
  features: {
    realTime: process.env.ENABLE_REAL_TIME === 'true',
    notifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    caching: process.env.ENABLE_CACHING === 'true',
    swagger: process.env.ENABLE_SWAGGER === 'true',
    morganLogging: process.env.ENABLE_MORGAN_LOGGING === 'true'
  },

  // Development Configuration
  development: {
    debug: process.env.DEBUG || 'dfashion:*'
  }
};

// Validation function
const validateConfig = () => {
  const required = [
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    console.warn('💡 Using fallback values for development');
  }

  // Validate MongoDB URI
  if (!config.database.uri && !config.database.atlasUri) {
    console.error('❌ No MongoDB URI provided');
    return false;
  }

  return true;
};

// Get configuration for specific environment
const getConfig = (env = process.env.NODE_ENV) => {
  const baseConfig = { ...config };
  
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          uri: baseConfig.database.atlasUri || baseConfig.database.uri
        },
        logging: {
          ...baseConfig.logging,
          level: 'error'
        },
        security: {
          helmet: true,
          rateLimit: true,
          cors: true
        }
      };
      
    case 'test':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          uri: 'mongodb://127.0.0.1:27017/dfashion_test'
        },
        logging: {
          ...baseConfig.logging,
          level: 'silent'
        }
      };
      
    default: // development
      return baseConfig;
  }
};

// Unified models entrypoint
const getModels = () => {
  return require('../models');
};

module.exports = {
  config,
  validateConfig,
  getConfig,
  getModels
};
