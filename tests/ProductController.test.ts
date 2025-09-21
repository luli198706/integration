
import request from 'supertest';
import express from 'express';
import { ProductController } from '../src/controllers/ProductController';
import { ProductService } from '../src/services/ProductService';
import { IdempotencyService } from '../src/services/IdempotencyService';
import { Product, ProductWithStock } from '../src/models/Product';

// Mock the dependencies
jest.mock('../src/services/ProductService');
jest.mock('../src/services/IdempotencyService');

const mockedProductService = ProductService as jest.MockedClass<typeof ProductService>;
const mockedIdempotencyService = IdempotencyService as jest.MockedClass<typeof IdempotencyService>;

describe('ProductController', () => {
  let app: express.Application;
  let productService: jest.Mocked<ProductService>;
  let idempotencyService: jest.Mocked<IdempotencyService>;

  // Use string dates for mock data to match JSON serialization
  const mockProduct: ProductWithStock = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    category: 'electronics',
    stock: 10,
    inStock: true,
    stockLocation: 'warehouse-a',
  };

  const mockProducts: ProductWithStock[] = [mockProduct];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    productService = new mockedProductService({} as any, {} as any, {} as any) as jest.Mocked<ProductService>;
    idempotencyService = new mockedIdempotencyService() as jest.Mocked<IdempotencyService>;

    const controller = new ProductController(productService, idempotencyService);
    
    app = express();
    app.use(express.json());
    
    // Setup routes
    app.get('/products', (req, res) => controller.getProducts(req, res));
    app.post('/products', (req, res) => controller.createProduct(req, res));
    app.get('/products/:id', (req, res) => controller.getProduct(req, res));
    app.put('/products/:id', (req, res) => controller.updateProduct(req, res));
    app.delete('/products/:id', (req, res) => controller.deleteProduct(req, res));
  });

  describe('GET /products', () => {
    it('should return list of products', async () => {
      productService.getAllProducts.mockResolvedValue(mockProducts);

      const response = await request(app).get('/products');
      
      expect(response.status).toBe(200);
      // Use toMatchObject for partial matching or check specific fields
      expect(response.body).toEqual(mockProducts);
      expect(productService.getAllProducts).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when service fails', async () => {
      productService.getAllProducts.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app).get('/products');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch products');
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', async () => {
      productService.getProductById.mockResolvedValue(mockProduct);

      const response = await request(app).get('/products/1');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProduct);
      expect(productService.getProductById).toHaveBeenCalledWith('1');
    });

    it('should return 404 when product not found', async () => {
      productService.getProductById.mockResolvedValue(null);

      const response = await request(app).get('/products/999');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 500 when service fails', async () => {
      productService.getProductById.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app).get('/products/1');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch product');
    });
  });

    describe('PUT /products/:id', () => {
    const updateData = {
      name: 'Updated Product',
      price: 79.99
    };

    it('should update a product successfully', async () => {
      idempotencyService.checkAndStore.mockResolvedValue(false);
      productService.updateProduct.mockResolvedValue({ 
        ...mockProduct, 
        ...updateData 
      } as Product);

      const response = await request(app)
        .put('/products/1')
        .set('Idempotency-Key', 'update-key-123')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Product');
      expect(idempotencyService.checkAndStore).toHaveBeenCalledWith(
        'update-key-123',
        'update-product-1',
        updateData
      );
      expect(productService.updateProduct).toHaveBeenCalledWith(
        '1',
        { ...updateData, id: '1' },
        'update-key-123'
      );
    });

    it('should return 400 when Idempotency-Key header is missing', async () => {
      const response = await request(app)
        .put('/products/1')
        .send(updateData);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Idempotency-Key header required');
    });

    it('should return 409 for duplicate update request', async () => {
      idempotencyService.checkAndStore.mockResolvedValue(true);

      const response = await request(app)
        .put('/products/1')
        .set('Idempotency-Key', 'duplicate-update-key')
        .send(updateData);
      
      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Duplicate request');
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete a product successfully', async () => {
      productService.deleteProduct.mockResolvedValue(true);

      const response = await request(app).delete('/products/1');
      
      expect(response.status).toBe(204);
      expect(productService.deleteProduct).toHaveBeenCalledWith('1');
    });

    it('should return 404 when product not found', async () => {
      productService.deleteProduct.mockResolvedValue(false);

      const response = await request(app).delete('/products/999');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Product not found');
    });

    it('should return 500 when service fails', async () => {
      productService.deleteProduct.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/products/1');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete product');
    });
  });

  // Test for circuit breaker integration (simulated)
  describe('Resilience patterns', () => {
    it('should handle service timeouts gracefully', async () => {
      productService.getAllProducts.mockRejectedValue({
        code: 'ETIMEDOUT',
        message: 'Request timeout'
      });

      const response = await request(app).get('/products');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch products');
    });
  });
});