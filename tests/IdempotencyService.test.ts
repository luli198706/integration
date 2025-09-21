import { IdempotencyService } from '../src/services/IdempotencyService';

describe('IdempotencyService', () => {
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    idempotencyService = new IdempotencyService(300000); // 5 minutes TTL
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkAndStore', () => {
    it('should return false for new requests and store them', async () => {
      const isDuplicate = await idempotencyService.checkAndStore(
        'test-key-123',
        'create-product',
        { name: 'Test Product', price: 100 }
      );

      expect(isDuplicate).toBe(false);
    });

    it('should return true for duplicate requests with same key and body', async () => {
      const requestBody = { name: 'Test Product', price: 100 };

      // First request
      const firstCall = await idempotencyService.checkAndStore(
        'test-key-123',
        'create-product',
        requestBody
      );
      expect(firstCall).toBe(false);

      // Duplicate request
      const secondCall = await idempotencyService.checkAndStore(
        'test-key-123',
        'create-product',
        requestBody
      );
      expect(secondCall).toBe(true);
    });

    it('should return false for same key but different operation', async () => {
      const requestBody = { name: 'Test Product', price: 100 };

      await idempotencyService.checkAndStore(
        'test-key-123',
        'create-product',
        requestBody
      );

      const result = await idempotencyService.checkAndStore(
        'test-key-123',
        'update-product', // Different operation
        requestBody
      );

      expect(result).toBe(false);
    });

    it('should return false for same key but different body', async () => {
      await idempotencyService.checkAndStore(
        'test-key-123',
        'create-product',
        { name: 'Product A', price: 100 }
      );

      const result = await idempotencyService.checkAndStore(
        'test-key-123',
        'create-product',
        { name: 'Product B', price: 200 } // Different body
      );

      expect(result).toBe(false);
    });

    it('should handle different idempotency keys independently', async () => {
      const requestBody = { name: 'Test Product', price: 100 };

      await idempotencyService.checkAndStore(
        'key-1',
        'create-product',
        requestBody
      );

      const result = await idempotencyService.checkAndStore(
        'key-2', // Different key
        'create-product',
        requestBody
      );

      expect(result).toBe(false);
    });
  });

  describe('body hashing', () => {
    it('should generate same hash for identical objects', async () => {
      const body1 = { name: 'Test', price: 100, nested: { value: 1 } };
      const body2 = { name: 'Test', price: 100, nested: { value: 1 } };

      await idempotencyService.checkAndStore('key-1', 'op', body1);
      const result = await idempotencyService.checkAndStore('key-1', 'op', body2);

      expect(result).toBe(true);
    });

    it('should generate different hash for different objects', async () => {
      const body1 = { name: 'Test', price: 100 };
      const body2 = { name: 'Test', price: 200 }; // Different price

      await idempotencyService.checkAndStore('key-1', 'op', body1);
      const result = await idempotencyService.checkAndStore('key-1', 'op', body2);

      expect(result).toBe(false);
    });

    it('should handle different data types consistently', async () => {
      const result1 = await idempotencyService.checkAndStore('key-1', 'op', 'string data');
      const result2 = await idempotencyService.checkAndStore('key-1', 'op', { data: 'string data' });

      expect(result1).toBe(false); // First call should not be duplicate
      expect(result2).toBe(false); // Different data structure
    });
  });

  describe('error handling', () => {
    it('should handle empty and null bodies', async () => {
      const result1 = await idempotencyService.checkAndStore('key-1', 'op', null);
      const result2 = await idempotencyService.checkAndStore('key-1', 'op', undefined);
      const result3 = await idempotencyService.checkAndStore('key-1', 'op', '');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should handle duplicate calls with empty bodies', async () => {
      await idempotencyService.checkAndStore('key-1', 'op', null);
      const result = await idempotencyService.checkAndStore('key-1', 'op', null);

      expect(result).toBe(true);
    });
  });
});