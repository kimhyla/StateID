import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { metricsService } from './metrics-service';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.client = createClient({
        url: config.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          commandTimeout: 1000, // Fast timeout for <200ms requirement
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              console.error('Max Redis reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 50, 500); // Exponential backoff, max 500ms
          }
        }
      });

      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
        console.log(`Redis reconnecting... attempt ${this.reconnectAttempts}`);
      });

      await this.client.connect();

    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get a value from Redis with metrics tracking
   */
  async get(key: string): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected || !this.client) {
        metricsService.recordCacheOperation('miss', key);
        return null;
      }

      const value = await this.client.get(key);
      const latency = Date.now() - startTime;
      
      metricsService.recordCacheOperation(value ? 'hit' : 'miss', key);
      
      // Log slow cache operations
      if (latency > 50) {
        console.warn(`Slow Redis GET operation: ${latency}ms for key ${key}`);
      }
      
      return value;
      
    } catch (error) {
      metricsService.recordCacheOperation('miss', key);
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set a value in Redis with TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      
      const latency = Date.now() - startTime;
      metricsService.recordCacheOperation('set', key);
      
      // Log slow cache operations
      if (latency > 50) {
        console.warn(`Slow Redis SET operation: ${latency}ms for key ${key}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.del(key);
      return result > 0;
      
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.exists(key);
      return result > 0;
      
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Set with NX (only if not exists) - useful for locking
   */
  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      let result;
      if (ttlSeconds) {
        result = await this.client.set(key, value, { NX: true, EX: ttlSeconds });
      } else {
        result = await this.client.set(key, value, { NX: true });
      }
      
      return result === 'OK';
      
    } catch (error) {
      console.error('Redis SETNX error:', error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      if (!this.isConnected || !this.client) {
        return 0;
      }

      return await this.client.incr(key);
      
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.expire(key, seconds);
      return result;
      
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once (pipeline for efficiency)
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      if (!this.isConnected || !this.client || keys.length === 0) {
        return keys.map(() => null);
      }

      return await this.client.mGet(keys);
      
    } catch (error) {
      console.error('Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Pipeline multiple operations for efficiency
   */
  async pipeline(operations: Array<{ cmd: string; args: any[] }>): Promise<any[]> {
    try {
      if (!this.isConnected || !this.client) {
        return [];
      }

      const pipeline = this.client.multi();
      
      for (const op of operations) {
        switch (op.cmd) {
          case 'get':
            pipeline.get(op.args[0]);
            break;
          case 'set':
            if (op.args.length === 3) {
              pipeline.setEx(op.args[0], op.args[2], op.args[1]);
            } else {
              pipeline.set(op.args[0], op.args[1]);
            }
            break;
          case 'del':
            pipeline.del(op.args[0]);
            break;
          case 'incr':
            pipeline.incr(op.args[0]);
            break;
        }
      }
      
      return await pipeline.exec();
      
    } catch (error) {
      console.error('Redis pipeline error:', error);
      return [];
    }
  }

  /**
   * Get connection status
   */
  isReady(): boolean {
    return this.isConnected && this.client?.isReady === true;
  }

  /**
   * Get Redis info for monitoring
   */
  async getInfo(): Promise<any> {
    try {
      if (!this.isConnected || !this.client) {
        return null;
      }

      const info = await this.client.info();
      return this.parseRedisInfo(info);
      
    } catch (error) {
      console.error('Redis INFO error:', error);
      return null;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
      }
    } catch (error) {
      console.error('Redis shutdown error:', error);
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const parsed: Record<string, any> = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key] = isNaN(Number(value)) ? value : Number(value);
        }
      }
    }
    
    return parsed;
  }
}

// Export singleton instance
export const redisService = new RedisService();