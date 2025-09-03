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
}

class QuotationIdGenerator {
  private static readonly STORAGE_KEY = 'orion_quotation_ids';
  private static readonly MAX_SERIAL = 999; // Maximum 3-digit serial

  /**
   * Generate a unique quotation ID in the format: ORION/{YEAR}/{MONTH}/{USERNAME}/{SERIAL}
   */
  static generateQuotationId(username: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the next serial number for this user and month
    const serial = this.getNextSerialNumber(username, year, month);
    
    return `ORION/${year}/${month}/${username.toUpperCase()}/${serial}`;
  }

  /**
   * Get the next available serial number for a specific user and month
   */
  private static getNextSerialNumber(username: string, year: string, month: string): string {
    const storedIds = this.getStoredQuotationIds();
    
    // Filter IDs for the same user, year, and month
    const relevantIds = storedIds.filter(id => 
      id.username.toLowerCase() === username.toLowerCase() &&
      id.year === year &&
      id.month === month
    );

    if (relevantIds.length === 0) {
      return '001';
    }

    // Extract serial numbers and find the highest
    const serialNumbers = relevantIds.map(id => {
      const parts = id.id.split('/');
      return parseInt(parts[4] || '0', 10);
    });

    const maxSerial = Math.max(...serialNumbers);
    const nextSerial = maxSerial + 1;

    if (nextSerial > this.MAX_SERIAL) {
      throw new Error(`Maximum serial number (${this.MAX_SERIAL}) exceeded for user ${username} in ${month}/${year}`);
    }

    return nextSerial.toString().padStart(3, '0');
  }

  /**
   * Store a generated quotation ID to maintain uniqueness
   */
  static storeQuotationId(quotationId: string, username: string): void {
    const storedIds = this.getStoredQuotationIds();
    
    // Add the new ID
    const newId: StoredQuotationId = {
      id: quotationId,
      timestamp: Date.now(),
      username: username.toUpperCase(),
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString().padStart(2, '0')
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
   * Get the current month's statistics for a user
   */
  static getUserMonthStats(username: string): { total: number; lastId?: string } {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    const storedIds = this.getStoredQuotationIds();
    const relevantIds = storedIds.filter(id => 
      id.username.toLowerCase() === username.toLowerCase() &&
      id.year === year &&
      id.month === month
    );

    return {
      total: relevantIds.length,
      lastId: relevantIds.length > 0 ? relevantIds[relevantIds.length - 1].id : undefined
    };
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
