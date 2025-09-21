import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { ProductController } from './controllers/ProductController';
import { ProductControllerV2 } from './controllers/v2/ProductControllerV2';
import { ProductService } from './services/ProductService';
import { IdempotencyService } from './services/IdempotencyService';
import { CacheService } from './services/CacheService';
import { ERPClient } from './clients/ERPClient';
import { WarehouseClient } from './clients/WarehouseClient';

// Initialize services and clients
const erpClient = new ERPClient();
const warehouseClient = new WarehouseClient();
const cacheService = new CacheService(config.cacheTTL);
const idempotencyService = new IdempotencyService(config.idempotencyKeyTtl);
const productService = new ProductService(erpClient, warehouseClient, cacheService);

// Initialize controllers
const productController = new ProductController(productService, idempotencyService);
const productControllerV2 = new ProductControllerV2(productService);

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// V1 Routes
app.get('/v1/products', (req, res) => productController.getProducts(req, res));
app.post('/v1/products', (req, res) => productController.createProduct(req, res));
app.get('/v1/products/:id', (req, res) => productController.getProduct(req, res));
app.put('/v1/products/:id', (req, res) => productController.updateProduct(req, res));
app.delete('/v1/products/:id', (req, res) => productController.deleteProduct(req, res));

// V2 Routes (backward compatible)
app.get('/v2/products', (req, res) => productControllerV2.getProducts(req, res));
app.get('/v2/products/:id', (req, res) => productControllerV2.getProduct(req, res));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health/detailed', async (req, res) => {
  try {
    const [erpHealth, warehouseHealth] = await Promise.all([
      erpClient.healthCheck(),
      warehouseClient.healthCheck()
    ]);

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        erp: erpHealth ? 'healthy' : 'unhealthy',
        warehouse: warehouseHealth ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: 'Failed to check upstream services'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method 
  });
});

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
const server = app.listen(config.serverPort, () => {
  console.log(`Integration Gateway running on port ${config.serverPort}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`ERP Service: ${config.erpBaseUrl}`);
  console.log(`Warehouse Service: ${config.warehouseBaseUrl}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server;
