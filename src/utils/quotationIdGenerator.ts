interface QuotationIdData {
  year: string;
  month: string;
  username: string;
  serial: string;
}

interface StoredQuotationId {
  id: string;
  timestamp: number;
  username: string;
  year: string;
  month: string;
  day: string;
}

class QuotationIdGenerator {
  private static readonly STORAGE_KEY = 'orion_quotation_ids';
  private static readonly MAX_SERIAL = 999; // Maximum 3-digit serial

  /**
   * Generate a unique quotation ID in the format: ORION/{YEAR}/{MONTH}/{DAY}/{FIRSTNAME}/{SERIAL}
   * Auto-increments the 3-digit counter and checks database for duplicates
   */
  static async generateQuotationId(username: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Extract only the first name from the full name
    const firstName = username.trim().split(' ')[0].toUpperCase();
    
    // Get the next serial number for this user and date
    const serial = await this.getNextSerialNumber(firstName, year, month, day);
    
    const quotationId = `ORION/${year}/${month}/${day}/${firstName}/${serial}`;
    
    // Store the generated ID
    this.storeQuotationId(quotationId, firstName);
    
    return quotationId;
  }

  /**
   * Get the next available serial number for a specific user and date
   * Checks both localStorage and database for existing quotation IDs
   */
  private static async getNextSerialNumber(firstName: string, year: string, month: string, day: string): Promise<string> {
    const storedIds = this.getStoredQuotationIds();
    
    // Filter IDs for the same user, year, month, and day
    const relevantIds = storedIds.filter(id => 
      id.username.toLowerCase() === firstName.toLowerCase() &&
      id.year === year &&
      id.month === month &&
      id.day === day
    );

    // Extract serial numbers from localStorage and find the highest
    let maxSerial = 0;
    if (relevantIds.length > 0) {
      const serialNumbers = relevantIds.map(id => {
        const parts = id.id.split('/');
        return parseInt(parts[5] || '0', 10); // Serial is now at index 5
      });
      maxSerial = Math.max(...serialNumbers);
    }

    // Also check database for the latest quotation ID
    const dbMaxSerial = await this.getLatestSerialFromDatabase(firstName, year, month, day);
    maxSerial = Math.max(maxSerial, dbMaxSerial);

    const nextSerial = maxSerial + 1;

    if (nextSerial > this.MAX_SERIAL) {
      throw new Error(`Maximum serial number (${this.MAX_SERIAL}) exceeded for user ${firstName} on ${day}/${month}/${year}`);
    }

    return nextSerial.toString().padStart(3, '0');
  }

  /**
   * Get the latest serial number from database for a specific user and date
   * This prevents duplicates when multiple users are creating quotations
   */
  private static async getLatestSerialFromDatabase(firstName: string, year: string, month: string, day: string): Promise<number> {
    try {
      // Check if we're in a browser environment with access to fetch
      if (typeof window !== 'undefined' && window.fetch) {
        // Make API call to check latest quotation ID pattern in database
        const response = await fetch('/api/sales/check-latest-quotation-id', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            year,
            month,
            day
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.latestSerial || 0;
        }
      }
    } catch (error) {
      console.warn('Failed to check database for latest serial:', error);
    }
    return 0;
  }

  /**
   * Store a generated quotation ID to maintain uniqueness
   */
  static storeQuotationId(quotationId: string, firstName: string): void {
    const storedIds = this.getStoredQuotationIds();
    const now = new Date();
    
    // Add the new ID
    const newId: StoredQuotationId = {
      id: quotationId,
      timestamp: Date.now(),
      username: firstName.toUpperCase(),
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString().padStart(2, '0'),
      day: now.getDate().toString().padStart(2, '0')
    };

    storedIds.push(newId);

    // Clean up old entries (older than 2 years)
    const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);
    const filteredIds = storedIds.filter(id => id.timestamp > twoYearsAgo);

    // Store back to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredIds));
    } catch (error) {
      console.warn('Failed to store quotation ID to localStorage:', error);
    }
  }

  /**
   * Get all stored quotation IDs from localStorage
   */
  private static getStoredQuotationIds(): StoredQuotationId[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve quotation IDs from localStorage:', error);
      return [];
    }
  }

  /**
   * Get the current day's statistics for a user
   */
  static getUserDayStats(firstName: string): { total: number; lastId?: string } {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    const storedIds = this.getStoredQuotationIds();
    const relevantIds = storedIds.filter(id => 
      id.username.toLowerCase() === firstName.toLowerCase() &&
      id.year === year &&
      id.month === month &&
      id.day === day
    );

    return {
      total: relevantIds.length,
      lastId: relevantIds.length > 0 ? relevantIds[relevantIds.length - 1].id : undefined
    };
  }

  /**
   * Generate a fallback unique quotation ID using random components
   * This is used when the standard format might have conflicts
   */
  static generateFallbackQuotationId(username: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Extract only the first name from the full name
    const firstName = username.trim().split(' ')[0].toUpperCase();
    
    // Use random number for uniqueness
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `ORION/${year}/${month}/${day}/${firstName}/${random}`;
  }

  /**
   * Reset the quotation ID counter (useful for testing or admin purposes)
   */
  static resetCounter(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to reset quotation ID counter:', error);
    }
  }
}

export default QuotationIdGenerator;
