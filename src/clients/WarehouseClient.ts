import { BaseClient } from './BaseClient';
import { Stock } from '../models/Product';
import { config } from '../config/config';

export class WarehouseClient extends BaseClient {
  constructor() {
    super(config.warehouseBaseUrl);
  }

  async getStock(productId: string): Promise<Stock | null> {
    return this.executeWithRetry(async () => {
      try {
        const data = await this.circuitBreaker.fire({
          method: 'GET',
          url: `/stock/${productId}`
        });
        return this.mapToStock(data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    });
  }

  async getBulkStocks(productIds: string[]): Promise<Map<string, Stock>> {
    if (productIds.length === 0) {
      return new Map();
    }

    return this.executeWithRetry(async () => {
      try {
        const data = await this.circuitBreaker.fire({
          method: 'POST',
          url: '/stock/bulk',
          data: { productIds }
        });
        return this.mapBulkStocks(data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          return new Map();
        }
        throw error;
      }
    });
  }

  async getAllStocks(): Promise<Map<string, Stock>> {
    return this.executeWithRetry(async () => {
      try {
        const data = await this.circuitBreaker.fire({
          method: 'GET',
          url: '/stock'
        });
        return this.mapBulkStocks(data);
      } catch (error: any) {
        console.error('Failed to fetch all stocks:', error);
        return new Map();
      }
    });
  }

  private mapToStock(data: any): Stock {
    return {
      productId: data.productId || data.id,
      quantity: data.quantity || data.stockLevel || 0,
      location: data.location || 'unknown',
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
      reserved: data.reserved || 0,
      inTransit: data.inTransit || 0,
      status: data.status || (data.quantity > 0 ? 'in_stock' : 'out_of_stock')
    };
  }

  private mapBulkStocks(data: any): Map<string, Stock> {
    const stockMap = new Map<string, Stock>();
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        const stock = this.mapToStock(item);
        stockMap.set(stock.productId, stock);
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([productId, stockData]: [string, any]) => {
        const stock = this.mapToStock(stockData);
        stockMap.set(productId, stock);
      });
    }
    
    return stockMap;
  }
}