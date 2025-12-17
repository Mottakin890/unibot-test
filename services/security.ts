
/**
 * PHASE 8: SECURITY SERVICE
 * Handles Encryption, Rate Limiting, and Access Control helpers.
 */

export class SecurityService {
  
  // --- ENCRYPTION (Simulated for Client-Side Demo) ---
  // In a real app, strictly never store raw secrets in localStorage.
  // We use a simple XOR + Base64 obfuscation here to prevent casual reading of API keys in devtools.
  
  private static SECRET_SALT = 'unibot_secure_salt_v1';

  static encrypt(text: string): string {
    if (!text) return '';
    const chars = text.split('');
    const saltChars = this.SECRET_SALT.split('');
    const encrypted = chars.map((char, i) => 
       String.fromCharCode(char.charCodeAt(0) ^ saltChars[i % saltChars.length].charCodeAt(0))
    ).join('');
    return btoa(encrypted); // Base64 encode
  }

  static decrypt(encoded: string): string {
    if (!encoded) return '';
    try {
      const decoded = atob(encoded); // Base64 decode
      const chars = decoded.split('');
      const saltChars = this.SECRET_SALT.split('');
      return chars.map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ saltChars[i % saltChars.length].charCodeAt(0))
      ).join('');
    } catch (e) {
      console.error("Decryption failed");
      return '';
    }
  }

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
