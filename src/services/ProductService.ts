import { ERPClient } from '../clients/ERPClient';
import { WarehouseClient } from '../clients/WarehouseClient';
import { CacheService } from './CacheService';
import { 
  Product, 
  ProductWithStock, 
  CreateProductRequest, 
  UpdateProductRequest,
  Stock
} from '../models/Product';

export class ProductService {
  constructor(
    private erpClient: ERPClient,
    private warehouseClient: WarehouseClient,
    private cacheService: CacheService
  ) {}

  async getAllProducts(): Promise<ProductWithStock[]> {
    const cacheKey = 'products:all';
    const cached = this.cacheService.get<ProductWithStock[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const [erpProducts, warehouseStocks] = await Promise.all([
        this.erpClient.getProducts(),
        this.warehouseClient.getAllStocks()
      ]);

      const mergedProducts = this.mergeProductsWithStock(erpProducts, warehouseStocks);
      this.cacheService.set(cacheKey, mergedProducts);

      return mergedProducts;
    } catch (error) {
      console.error('Failed to fetch all products:', error);
      throw new Error('Failed to fetch products from upstream services');
    }
  }

  async getProductById(id: string): Promise<ProductWithStock | null> {
    const cacheKey = `product:${id}`;
    const cached = this.cacheService.get<ProductWithStock>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const [product, stock] = await Promise.all([
        this.erpClient.getProduct(id),
        this.warehouseClient.getStock(id)
      ]);

      if (!product) {
        return null;
      }

      const mergedProduct = this.mergeProductWithStock(product, stock);
      this.cacheService.set(cacheKey, mergedProduct);

      return mergedProduct;
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      throw new Error(`Failed to fetch product ${id}`);
    }
  }

  async createProduct(productData: CreateProductRequest, idempotencyKey: string): Promise<Product> {
    try {
      const product = await this.erpClient.createProduct(productData, idempotencyKey);
      this.invalidateCache();
      return product;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw new Error('Failed to create product');
    }
  }

  async updateProduct(id: string, productData: UpdateProductRequest, idempotencyKey: string): Promise<Product> {
    try {
      const product = await this.erpClient.updateProduct(id, productData, idempotencyKey);
      this.invalidateCache();
      this.cacheService.del(`product:${id}`);
      return product;
    } catch (error) {
      console.error(`Failed to update product ${id}:`, error);
      throw new Error(`Failed to update product ${id}`);
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const success = await this.erpClient.deleteProduct(id);
      if (success) {
        this.invalidateCache();
        this.cacheService.del(`product:${id}`);
      }
      return success;
    } catch (error) {
      console.error(`Failed to delete product ${id}:`, error);
      throw new Error(`Failed to delete product ${id}`);
    }
  }

  private mergeProductsWithStock(products: Product[], stocks: Map<string, Stock>): ProductWithStock[] {
    return products.map(product => this.mergeProductWithStock(product, stocks.get(product.id)));
  }

  private mergeProductWithStock(product: Product, stock?: Stock | null): ProductWithStock {
    const stockQuantity = stock?.quantity || 0;
    
    return {
      ...product,
      stock: stockQuantity,
      inStock: stockQuantity > 0,
      stockLocation: stock?.location,
      stockLastUpdated: stock?.lastUpdated
    };
  }

  private invalidateCache(): void {
    this.cacheService.del('products:all');
  }
}