import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  serverPort: number;
  erpBaseUrl: string;
  warehouseBaseUrl: string;
  requestTimeout: number;
  cacheTTL: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
  idempotencyKeyTtl: number;
  nodeEnv: string;
  jwtSecret: string;
  rateLimitMax: number;
  allowedOrigins: string[];
}

export const config: Config = {
  serverPort: parseInt(process.env.SERVER_PORT || '8080'),
  erpBaseUrl: process.env.ERP_BASE_URL || 'http://localhost:8081',
  warehouseBaseUrl: process.env.WAREHOUSE_BASE_URL || 'http://localhost:8082',
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '10000'),
  cacheTTL: parseInt(process.env.CACHE_TTL || '30000'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
  idempotencyKeyTtl: parseInt(process.env.IDEMPOTENCY_KEY_TTL || '300000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080']
};

// Validate required environment variables
export const validateEnv = () => {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config.jwtSecret === 'fallback-secret-change-in-production' && config.nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
};