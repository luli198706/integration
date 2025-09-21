import { BaseClient } from './BaseClient';
import { Product, CreateProductRequest, UpdateProductRequest } from '../models/Product';
import { config } from '../config/config';

export class ERPClient extends BaseClient {
  constructor() {
    super(config.erpBaseUrl);
  }

  async getProducts(): Promise<Product[]> {
    return this.executeWithRetry(async () => {
      const data = await this.circuitBreaker.fire({
        method: 'GET',
        url: '/products'
      });
      return Array.isArray(data) ? data.map(item => this.mapToProduct(item)) : [];
    });
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.executeWithRetry(async () => {
      try {
        const data = await this.circuitBreaker.fire({
          method: 'GET',
          url: `/products/${id}`
        });
        return this.mapToProduct(data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    });
  }

  async createProduct(product: CreateProductRequest, idempotencyKey: string): Promise<Product> {
    return this.executeWithRetry(async () => {
      const data = await this.circuitBreaker.fire({
        method: 'POST',
        url: '/products',
        data: product,
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      return this.mapToProduct(data);
    });
  }

  async updateProduct(id: string, product: UpdateProductRequest, idempotencyKey: string): Promise<Product> {
    return this.executeWithRetry(async () => {
      const data = await this.circuitBreaker.fire({
        method: 'PUT',
        url: `/products/${id}`,
        data: product,
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      return this.mapToProduct(data);
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.executeWithRetry(async () => {
      try {
        await this.circuitBreaker.fire({
          method: 'DELETE',
          url: `/products/${id}`
        });
        return true;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return false;
        }
        throw error;
      }
    });
  }

  private mapToProduct(data: any): Product {
    return {
      id: data.id || data._id,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      sku: data.sku,
      manufacturer: data.manufacturer,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      status: data.status || 'active'
    };
  }
}