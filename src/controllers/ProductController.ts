import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { IdempotencyService } from '../services/IdempotencyService';

export class ProductController {
  constructor(
    private productService: ProductService,
    private idempotencyService: IdempotencyService
  ) {}

  // GET /v1/products
  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await this.productService.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  // GET /v1/products/:id
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json(product);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  // POST /v1/products
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      if (!idempotencyKey) {
        res.status(400).json({ error: 'Idempotency-Key header required' });
        return;
      }

      const isDuplicate = await this.idempotencyService.checkAndStore(
        idempotencyKey,
        'create-product',
        req.body
      );

      if (isDuplicate) {
        res.status(409).json({ error: 'Duplicate request' });
        return;
      }

      const product = await this.productService.createProduct(req.body, idempotencyKey);
      res.status(201).json(product);
    } catch (error) {
      console.error('Failed to create product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // PUT /v1/products/:id
  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string;
      
      if (!idempotencyKey) {
        res.status(400).json({ error: 'Idempotency-Key header required' });
        return;
      }

      const isDuplicate = await this.idempotencyService.checkAndStore(
        idempotencyKey,
        `update-product-${req.params.id}`,
        req.body
      );

      if (isDuplicate) {
        res.status(409).json({ error: 'Duplicate request' });
        return;
      }

      const product = await this.productService.updateProduct(
        req.params.id, 
        { ...req.body, id: req.params.id },
        idempotencyKey
      );
      res.json(product);
    } catch (error) {
      console.error('Failed to update product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // DELETE /v1/products/:id
  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const success = await this.productService.deleteProduct(req.params.id);
      if (!success) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
}