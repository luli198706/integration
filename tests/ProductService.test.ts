import { ProductService } from '../src/services/ProductService';
import { ERPClient } from '../src/clients/ERPClient';
import { WarehouseClient } from '../src/clients/WarehouseClient';
import { CacheService } from '../src/services/CacheService';
import { Product, ProductWithStock, Stock } from '../src/models/Product';

// Mock the dependencies
jest.mock('../src/clients/ERPClient');
jest.mock('../src/clients/WarehouseClient');
jest.mock('../src/services/CacheService');

const mockedERPClient = ERPClient as jest.MockedClass<typeof ERPClient>;
const mockedWarehouseClient = WarehouseClient as jest.MockedClass<typeof WarehouseClient>;
const mockedCacheService = CacheService as jest.MockedClass<typeof CacheService>;

describe('ProductService', () => {
  let productService: ProductService;
  let erpClient: jest.Mocked<ERPClient>;
  let warehouseClient: jest.Mocked<WarehouseClient>;
  let cacheService: jest.Mocked<CacheService>;

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    category: 'electronics',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  };

  const mockStock: Stock = {
    productId: '1',
    quantity: 10,
    location: 'warehouse-a',
    lastUpdated: new Date(),
    reserved: 2,
    inTransit: 1,
    status: 'in_stock'
  };

  const mockProductWithStock: ProductWithStock = {
    ...mockProduct,
    stock: 10,
    inStock: true,
    stockLocation: 'warehouse-a',
    stockLastUpdated: mockStock.lastUpdated
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Create mock instances
    erpClient = new mockedERPClient() as jest.Mocked<ERPClient>;
    warehouseClient = new mockedWarehouseClient() as jest.Mocked<WarehouseClient>;
    cacheService = new mockedCacheService(30000) as jest.Mocked<CacheService>;

    productService = new ProductService(erpClient, warehouseClient, cacheService);
  });

  describe('getAllProducts', () => {
    it('should return products from cache if available', async () => {
      cacheService.get.mockReturnValue([mockProductWithStock]);

      const result = await productService.getAllProducts();
      
      expect(result).toEqual([mockProductWithStock]);
      expect(cacheService.get).toHaveBeenCalledWith('products:all');
      expect(erpClient.getProducts).not.toHaveBeenCalled(); // Should not call upstream
    });

    it('should fetch from upstream and cache when not in cache', async () => {
      cacheService.get.mockReturnValue(undefined); // Cache miss
      erpClient.getProducts.mockResolvedValue([mockProduct]);
      warehouseClient.getAllStocks.mockResolvedValue(new Map([['1', mockStock]]));

      const result = await productService.getAllProducts();
      
      expect(result).toEqual([mockProductWithStock]);
      expect(cacheService.get).toHaveBeenCalledWith('products:all');
      expect(erpClient.getProducts).toHaveBeenCalled();
      expect(warehouseClient.getAllStocks).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith('products:all', [mockProductWithStock]);
    });

    it('should handle empty products array', async () => {
      cacheService.get.mockReturnValue(undefined);
      erpClient.getProducts.mockResolvedValue([]);
      warehouseClient.getAllStocks.mockResolvedValue(new Map());

      const result = await productService.getAllProducts();
      
      expect(result).toEqual([]);
    });

    it('should throw error when upstream service fails', async () => {
      cacheService.get.mockReturnValue(undefined);
      erpClient.getProducts.mockRejectedValue(new Error('ERP service down'));

      await expect(productService.getAllProducts()).rejects.toThrow('Failed to fetch products from upstream services');
    });
  });

  describe('getProductById', () => {
    it('should return product from cache if available', async () => {
      cacheService.get.mockReturnValue(mockProductWithStock);

      const result = await productService.getProductById('1');
      
      expect(result).toEqual(mockProductWithStock);
      expect(cacheService.get).toHaveBeenCalledWith('product:1');
      expect(erpClient.getProduct).not.toHaveBeenCalled();
    });

    it('should fetch from upstream and cache when not in cache', async () => {
      cacheService.get.mockReturnValue(undefined);
      erpClient.getProduct.mockResolvedValue(mockProduct);
      warehouseClient.getStock.mockResolvedValue(mockStock);

      const result = await productService.getProductById('1');
      
      expect(result).toEqual(mockProductWithStock);
      expect(erpClient.getProduct).toHaveBeenCalledWith('1');
      expect(warehouseClient.getStock).toHaveBeenCalledWith('1');
      expect(cacheService.set).toHaveBeenCalledWith('product:1', mockProductWithStock);
    });

    it('should return null when product not found', async () => {
      cacheService.get.mockReturnValue(undefined);
      erpClient.getProduct.mockResolvedValue(null);

      const result = await productService.getProductById('999');
      
      expect(result).toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled(); // Should not cache null results
    });

    it('should handle missing stock information', async () => {
      cacheService.get.mockReturnValue(undefined);
      erpClient.getProduct.mockResolvedValue(mockProduct);
      warehouseClient.getStock.mockResolvedValue(null); // No stock data

      const result = await productService.getProductById('1');
      
      expect(result).toEqual({
        ...mockProduct,
        stock: 0,
        inStock: false,
        stockLocation: undefined,
        stockLastUpdated: undefined
      });
    });
  });

  describe('createProduct', () => {
    const newProductData = {
      name: 'New Product',
      description: 'New Description',
      price: 49.99,
      category: 'books'
    };

    it('should create product and invalidate cache', async () => {
      const createdProduct = { ...newProductData, id: '2' } as Product;
      erpClient.createProduct.mockResolvedValue(createdProduct);

      const result = await productService.createProduct(newProductData, 'idempotency-key-123');
      
      expect(result).toEqual(createdProduct);
      expect(erpClient.createProduct).toHaveBeenCalledWith(newProductData, 'idempotency-key-123');
      expect(cacheService.del).toHaveBeenCalledWith('products:all');
    });

    it('should throw error when creation fails', async () => {
      erpClient.createProduct.mockRejectedValue(new Error('Creation failed'));

      await expect(productService.createProduct(newProductData, 'test-key'))
        .rejects.toThrow('Failed to create product');
    });
  });

describe('updateProduct', () => {
    const updateData = {
      id: '1', 
      name: 'Updated Product',
      price: 79.99
    };
  
    it('should update product and invalidate cache', async () => {
      const updatedProduct = { ...mockProduct, ...updateData };
      erpClient.updateProduct.mockResolvedValue(updatedProduct);
  
      const result = await productService.updateProduct('1', updateData, 'update-key-123');
      
      expect(result).toEqual(updatedProduct);
      expect(erpClient.updateProduct).toHaveBeenCalledWith('1', updateData, 'update-key-123');
      expect(cacheService.del).toHaveBeenCalledWith('products:all');
      expect(cacheService.del).toHaveBeenCalledWith('product:1');
    });
  
    it('should throw error when update fails', async () => {
              erpClient.updateProduct.mockRejectedValue(new Error('Update failed'));
        
              await expect(productService.updateProduct('1', updateData, 'test-key'))
                .rejects.toThrow('Failed to update product 1');
    });
  });

  describe('deleteProduct', () => {
    it('should delete product and invalidate cache', async () => {
      erpClient.deleteProduct.mockResolvedValue(true);

      const result = await productService.deleteProduct('1');
      
      expect(result).toBe(true);
      expect(erpClient.deleteProduct).toHaveBeenCalledWith('1');
      expect(cacheService.del).toHaveBeenCalledWith('products:all');
      expect(cacheService.del).toHaveBeenCalledWith('product:1');
    });

    it('should return false when product not found', async () => {
      erpClient.deleteProduct.mockResolvedValue(false);

      const result = await productService.deleteProduct('999');
      
      expect(result).toBe(false);
      expect(cacheService.del).not.toHaveBeenCalled(); // Should not invalidate cache if delete failed
    });

    it('should throw error when deletion fails', async () => {
      erpClient.deleteProduct.mockRejectedValue(new Error('Delete failed'));

      await expect(productService.deleteProduct('1'))
        .rejects.toThrow('Failed to delete product 1');
    });
  });

  describe('mergeProductWithStock', () => {
    it('should merge product with stock data', () => {
      const result = (productService as any).mergeProductWithStock(mockProduct, mockStock);
      
      expect(result).toEqual(mockProductWithStock);
    });

    it('should handle null stock data', () => {
      const result = (productService as any).mergeProductWithStock(mockProduct, null);
      
      expect(result).toEqual({
        ...mockProduct,
        stock: 0,
        inStock: false,
        stockLocation: undefined,
        stockLastUpdated: undefined
      });
    });

    it('should handle undefined stock data', () => {
      const result = (productService as any).mergeProductWithStock(mockProduct, undefined);
      
      expect(result).toEqual({
        ...mockProduct,
        stock: 0,
        inStock: false,
        stockLocation: undefined,
        stockLastUpdated: undefined
      });
    });

    it('should handle zero stock quantity', () => {
      const zeroStock: Stock = { ...mockStock, quantity: 0 };
      const result = (productService as any).mergeProductWithStock(mockProduct, zeroStock);
      
      expect(result.stock).toBe(0);
      expect(result.inStock).toBe(false);
    });
  });

  describe('mergeProductsWithStock', () => {
    it('should merge multiple products with stock data', () => {
      const products = [mockProduct, { ...mockProduct, id: '2' }];
      const stocks = new Map([
        ['1', mockStock],
        ['2', { ...mockStock, productId: '2', quantity: 0 }]
      ]);

      const result = (productService as any).mergeProductsWithStock(products, stocks);
      
      expect(result).toHaveLength(2);
      expect(result[0].stock).toBe(10);
      expect(result[0].inStock).toBe(true);
      expect(result[1].stock).toBe(0);
      expect(result[1].inStock).toBe(false);
    });

    it('should handle missing stock for some products', () => {
      const products = [mockProduct, { ...mockProduct, id: '2' }];
      const stocks = new Map([['1', mockStock]]); // Only stock for product 1

      const result = (productService as any).mergeProductsWithStock(products, stocks);
      
      expect(result).toHaveLength(2);
      expect(result[0].stock).toBe(10);
      expect(result[1].stock).toBe(0); // Default for missing stock
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache on write operations', async () => {
      // Create
      erpClient.createProduct.mockResolvedValue(mockProduct);
      await productService.createProduct({} as any, 'key');
      expect(cacheService.del).toHaveBeenCalledWith('products:all');

      // Update
      jest.clearAllMocks();
      erpClient.updateProduct.mockResolvedValue(mockProduct);
      await productService.updateProduct('1', {} as any, 'key');
      expect(cacheService.del).toHaveBeenCalledWith('products:all');
      expect(cacheService.del).toHaveBeenCalledWith('product:1');

      // Delete
      jest.clearAllMocks();
      erpClient.deleteProduct.mockResolvedValue(true);
      await productService.deleteProduct('1');
      expect(cacheService.del).toHaveBeenCalledWith('products:all');
      expect(cacheService.del).toHaveBeenCalledWith('product:1');
    });
  });

  describe('error handling', () => {
    it('should include product ID in error messages for specific operations', async () => {
      erpClient.getProduct.mockRejectedValue(new Error('Service down'));
      
      await expect(productService.getProductById('123')).rejects.toThrow('Failed to fetch product 123');

      erpClient.updateProduct.mockRejectedValue(new Error('Service down'));
      await expect(productService.updateProduct('123', {} as any, 'key')).rejects.toThrow('Failed to update product 123');

      erpClient.deleteProduct.mockRejectedValue(new Error('Service down'));
      await expect(productService.deleteProduct('123')).rejects.toThrow('Failed to delete product 123');
    });
  });
});