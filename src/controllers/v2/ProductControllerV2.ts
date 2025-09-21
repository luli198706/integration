import { Request, Response } from 'express';
import { ProductService } from '../../services/ProductService';

export class ProductControllerV2 {
  constructor(private productService: ProductService) {}

  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await this.productService.getAllProducts();
     
      const v2Products = products.map(product => ({
        ...product,
        metadata: {
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          cacheStatus: 'live'
        },
        links: {
          self: `/v2/products/${product.id}`,
          stock: `/v2/products/${product.id}/stock`,
          erp: `/v1/products/${product.id}`
        }
      }));

      res.json(v2Products);
    } catch (error) {
      console.error('Failed to fetch products V2:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const v2Product = {
        ...product,
        metadata: {
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          cacheStatus: 'live'
        },
        links: {
          self: `/v2/products/${product.id}`,
          stock: `/v2/products/${product.id}/stock`,
          erp: `/v1/products/${product.id}`
        },
        availability: {
          inStock: product.inStock,
          stockLevel: product.stock,
          location: product.stockLocation,
          lastUpdated: product.stockLastUpdated
        }
      };

      res.json(v2Product);
    } catch (error) {
      console.error('Failed to fetch product V2:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }
}