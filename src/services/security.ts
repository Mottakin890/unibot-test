/**
 * PHASE 8: SECURITY SERVICE
 * Handles Rate Limiting and Access Control helpers.
 */

export class SecurityService {
  
  // --- RATE LIMITING ---
  // Token Bucket implementation for API throttling.
  
  private static requestTimestamps: number[] = [];
  private static LIMIT = 20; // Max requests
  private static WINDOW_MS = 60000; // Per minute

  static checkRateLimit(): boolean {
    const now = Date.now();
    // Remove timestamps older than the window
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.WINDOW_MS);
    
    if (this.requestTimestamps.length >= this.LIMIT) {
      return false; // Rate limited
    }
    
    this.requestTimestamps.push(now);
    return true; // Allowed
  }

  static getRateLimitStatus() {
     return {
         used: this.requestTimestamps.length,
         limit: this.LIMIT,
         remaining: this.LIMIT - this.requestTimestamps.length
     };
  }
}