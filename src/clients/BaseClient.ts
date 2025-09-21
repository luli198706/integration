import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import CircuitBreaker from 'opossum';
import { config } from '../config/config';

export abstract class BaseClient {
  protected client: AxiosInstance;
  protected circuitBreaker: CircuitBreaker;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: config.requestTimeout
    });
     // The circuit breaker returns the data directly, not a response object
     this.circuitBreaker = new CircuitBreaker(
        async (requestConfig: AxiosRequestConfig) => {
          const response = await this.client.request(requestConfig);
          return response.data; // Return only the data
        },
        {
          timeout: config.requestTimeout,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          rollingCountTimeout: 15000,
          rollingCountBuckets: 10,
          name: this.constructor.name
        }
      );

    this.setupCircuitBreakerEvents();
  }

  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      console.warn(`${this.constructor.name} circuit breaker opened`);
    });

    this.circuitBreaker.on('halfOpen', () => {
      console.log(`${this.constructor.name} circuit breaker half-open`);
    });

    this.circuitBreaker.on('close', () => {
      console.log(`${this.constructor.name} circuit breaker closed`);
    });

    this.circuitBreaker.on('failure', (error) => {
      console.error(`${this.constructor.name} circuit breaker failure:`, error.message);
    });
  }
  

  protected async executeWithRetry(
    requestFn: () => Promise<any>,
    maxRetries: number = config.maxRetries
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries - 1) {
          await this.delayWithJitter(attempt);
          continue;
        }
      }
    }
    
    throw lastError!;
  }

  private delayWithJitter(attempt: number): Promise<void> {
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 500;
    return new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx errors are retryable
    return error.code === 'ECONNREFUSED' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ECONNRESET' ||
           error.response?.status >= 500;
  }

  async healthCheck(endpoint: string = '/health'): Promise<boolean> {
    try {
      const response = await this.client.get(endpoint, { 
        timeout: 5000,
        validateStatus: (status) => status < 500 // Consider any status < 500 as healthy
      });
      return response.status < 500;
    } catch (error) {
      console.error(`Health check failed for ${this.constructor.name}:`, error);
      return false;
    }
  }
}