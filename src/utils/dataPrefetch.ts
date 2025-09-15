// Data prefetching utilities for better performance
import { salesAPI } from '../api/sales';

class DataPrefetcher {
  private prefetchPromise: Promise<any> | null = null;
  private prefetchTimestamp: number = 0;
  private readonly PREFETCH_DURATION = 10 * 60 * 1000; // 10 minutes

  // Prefetch user profile data after successful login
  async prefetchUserData(): Promise<void> {
    if (this.prefetchPromise) {
      return this.prefetchPromise;
    }

    this.prefetchPromise = this.performPrefetch();
    this.prefetchTimestamp = Date.now();
    
    return this.prefetchPromise;
  }

  private async performPrefetch(): Promise<void> {
    try {
      // Prefetch user profile to cache it
      await salesAPI.getProfile();
      
      // Add more prefetching here as needed
      // For example: product data, configuration templates, etc.
      
    } catch (error) {
      console.warn('Data prefetching failed:', error);
    } finally {
      this.prefetchPromise = null;
    }
  }

  // Check if prefetch is needed
  shouldPrefetch(): boolean {
    return !this.prefetchPromise && (Date.now() - this.prefetchTimestamp) > this.PREFETCH_DURATION;
  }

  // Clear prefetch cache
  clearPrefetch(): void {
    this.prefetchPromise = null;
    this.prefetchTimestamp = 0;
  }
}

export const dataPrefetcher = new DataPrefetcher();
