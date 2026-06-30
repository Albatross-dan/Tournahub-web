import * as Sentry from '@sentry/react';

type NetworkCallback = (status: { isOnline: boolean; isRealConnection: boolean }) => void;

class NetworkService {
  private listeners = new Set<NetworkCallback>();
  private isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isRealConnectionState = true;
  private pingInProgress = false;
  private lastPingTime = 0;
  private pingInterval = 30000; // Cache ping results for 30s to avoid network chatter

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleStatusChange(true));
      window.addEventListener('offline', () => this.handleStatusChange(false));
      
      // Perform initial connection validation
      this.validateConnection();
    }
  }

  /**
   * Get the current synchronous network status
   */
  public getStatus() {
    return {
      isOnline: this.isOnlineState,
      isRealConnection: this.isRealConnectionState && this.isOnlineState,
    };
  }

  /**
   * Subscribe to network status updates
   */
  public subscribe(callback: NetworkCallback): () => void {
    this.listeners.add(callback);
    // Initial call
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all subscribers of status changes
   */
  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  /**
   * Handle basic online/offline events from the browser
   */
  private handleStatusChange(online: boolean) {
    this.isOnlineState = online;
    if (online) {
      this.validateConnection();
    } else {
      this.isRealConnectionState = false;
      this.notify();
    }
  }

  /**
   * Actively validate if there is real internet routing (not just local Wi-Fi connection)
   * This handles DNS failures, captive portals, and dead gateways gracefully.
   */
  public async validateConnection(force = false): Promise<boolean> {
    if (typeof window === 'undefined') return true;

    // Rate limit ping requests to prevent network overhead
    const now = Date.now();
    if (!force && this.pingInProgress) return this.isRealConnectionState;
    if (!force && now - this.lastPingTime < this.pingInterval) {
      return this.isRealConnectionState;
    }

    if (!navigator.onLine) {
      this.isOnlineState = false;
      this.isRealConnectionState = false;
      this.notify();
      return false;
    }

    this.pingInProgress = true;
    this.lastPingTime = now;

    try {
      // Fetch a small cache-busted asset to verify connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Use a fast static asset (the favicon or index.html) with a cache buster
      const response = await fetch(`/favicon.ico?_cb=${now}`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      
      const isHealthy = response.ok || response.status < 500;
      this.isRealConnectionState = isHealthy;
      this.isOnlineState = true;
    } catch (e) {
      // Fetch failed, meaning we are on a dead network/offline
      this.isRealConnectionState = false;
    } finally {
      this.pingInProgress = false;
      this.notify();
    }

    return this.isRealConnectionState;
  }

  /**
   * Dynamically report a successful operation (resets network health state instantly)
   */
  public reportSuccess() {
    if (!this.isOnlineState || !this.isRealConnectionState) {
      this.isOnlineState = true;
      this.isRealConnectionState = true;
      this.notify();
    }
  }

  /**
   * Dynamically report a network failure (triggers an active internet verification)
   */
  public reportFailure(error: any) {
    const isNetworkError = 
      error?.name === 'AbortError' || 
      error?.message?.toLowerCase().includes('failed to fetch') || 
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('load failed');

    if (isNetworkError) {
      this.validateConnection(true);
    }
  }
}

export const networkService = new NetworkService();
