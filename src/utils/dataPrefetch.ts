
import { salesAPI } from '../api/sales';

class DataPrefetcher {
  private prefetchPromise: Promise<any> | null = null;
  private prefetchTimestamp: number = 0;
  private readonly PREFETCH_DURATION = 10 * 60 * 1000; // 10 minutes

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

      await salesAPI.getProfile();

    } catch (error) {

    } finally {
      this.prefetchPromise = null;
    }
  }

  shouldPrefetch(): boolean {
    return !this.prefetchPromise && (Date.now() - this.prefetchTimestamp) > this.PREFETCH_DURATION;
  }

  clearPrefetch(): void {
    this.prefetchPromise = null;
    this.prefetchTimestamp = 0;
  }
}

export const dataPrefetcher = new DataPrefetcher();
