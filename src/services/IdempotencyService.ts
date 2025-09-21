import { createHash } from 'crypto';

interface IdempotencyRecord {
  timestamp: number;
  operation: string;
  bodyHash: string;
}

export class IdempotencyService {
  private store: Map<string, IdempotencyRecord>;
  private ttl: number;

  constructor(ttl: number = 300000) { // 5 minutes default
    this.store = new Map();
    this.ttl = ttl;
    this.cleanupInterval();
  }

  async checkAndStore(
    idempotencyKey: string, 
    operation: string, 
    body: any
  ): Promise<boolean> {
    const bodyHash = this.hashBody(body);
    const cacheKey = `${idempotencyKey}:${operation}:${bodyHash}`;

    if (this.store.has(cacheKey)) {
      return true; // Duplicate request
    }

    this.store.set(cacheKey, {
      timestamp: Date.now(),
      operation,
      bodyHash
    });

    return false;
  }

//   private hashBody(body: any): string {
//     const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
//     return createHash('sha256').update(bodyString).digest('hex');
//   }
private hashBody(body: any): string {
    try {
      let bodyString: string;
      
      if (body === null) {
        bodyString = 'null';
      } else if (body === undefined) {
        bodyString = 'undefined';
      } else if (typeof body === 'string') {
        bodyString = body;
      } else if (typeof body === 'object') {
        // Sort object keys for consistent hashing of equivalent objects
        const sortedObj = Object.keys(body)
          .sort()
          .reduce((acc, key) => {
            acc[key] = body[key];
            return acc;
          }, {} as any);
        bodyString = JSON.stringify(sortedObj);
      } else {
        bodyString = String(body);
      }
      
      return createHash('sha256').update(bodyString).digest('hex');
    } catch (error) {
      // Fallback for unstringifiable objects
      return createHash('sha256').update('unhashable').digest('hex');
    }
  }

  private cleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (now - record.timestamp > this.ttl) {
          this.store.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }
}