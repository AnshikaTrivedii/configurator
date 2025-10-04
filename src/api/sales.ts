const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SalesUser {
  email: string;
  name: string;
  location: string;
  contactNumber: string;
  role?: 'sales' | 'super';
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: SalesUser;
  mustChangePassword: boolean;
}

export interface SetPasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

class SalesAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('salesToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Cache for user data to avoid repeated API calls
  private userCache: SalesUser | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(): boolean {
    return this.userCache !== null && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  private setUserCache(user: SalesUser): void {
    this.userCache = user;
    this.cacheTimestamp = Date.now();
  }

  private clearUserCache(): void {
    this.userCache = null;
    this.cacheTimestamp = 0;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/sales/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Cache user data for faster subsequent access
    if (data.success && data.user) {
      this.setUserCache(data.user);
    }

    return data;
  }

  async setPassword(passwordData: SetPasswordRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/sales/set-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password setup failed');
    }

    return data;
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/sales/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password change failed');
    }

    return data;
  }

  async getProfile(): Promise<{ success: boolean; user: SalesUser; mustChangePassword: boolean }> {
    // Return cached data if available and valid
    if (this.isCacheValid() && this.userCache) {
      return {
        success: true,
        user: this.userCache,
        mustChangePassword: false
      };
    }

    const response = await fetch(`${API_BASE_URL}/sales/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profile');
    }

    // Cache the user data
    if (data.success && data.user) {
      this.setUserCache(data.user);
    }

    return data;
  }

  // Utility methods
  isLoggedIn(): boolean {
    return !!localStorage.getItem('salesToken');
  }

  getStoredUser(): SalesUser | null {
    const userStr = localStorage.getItem('salesUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  logout(): void {
    localStorage.removeItem('salesToken');
    localStorage.removeItem('salesUser');
    this.clearUserCache(); // Clear in-memory cache
  }

  setAuthData(token: string, user: SalesUser): void {
    localStorage.setItem('salesToken', token);
    localStorage.setItem('salesUser', JSON.stringify(user));
    this.setUserCache(user); // Cache in memory for faster access
  }

  async getDashboard(filters?: { startDate?: string; endDate?: string; location?: string }): Promise<{ success: boolean; data: any[]; filters: any }> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.location) queryParams.append('location', filters.location);

    const response = await fetch(`${API_BASE_URL}/sales/dashboard?${queryParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get dashboard data');
    }

    return data;
  }

  async getSalesPersons(): Promise<{ success: boolean; salesPersons: any[]; stats: any }> {
    console.log('🌐 Making API call to dashboard endpoint...');
    console.log('🔗 API URL:', `${API_BASE_URL}/sales/dashboard`);
    console.log('🔑 Auth headers:', this.getAuthHeaders());
    
    // Add cache-busting parameter
    const url = `${API_BASE_URL}/sales/dashboard?t=${Date.now()}`;
    console.log('🔗 Final URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    console.log('📡 API Response status:', response.status);
    console.log('📡 API Response ok:', response.ok);

    const data = await response.json();
    console.log('📦 Raw API response data:', data);

    if (!response.ok) {
      console.error('❌ API Error:', data);
      throw new Error(data.message || 'Failed to get sales persons data');
    }

    // Use the stats directly from the API response
    const salesPersons = data.data || [];
    const apiStats = data.stats || {};
    console.log('📊 API Stats received:', apiStats);
    console.log('💰 API totalRevenue:', apiStats.totalRevenue);
    console.log('💰 API totalRevenue type:', typeof apiStats.totalRevenue);
    console.log('💰 API totalRevenue === 0:', apiStats.totalRevenue === 0);
    console.log('💰 API totalRevenue == 0:', apiStats.totalRevenue == 0);
    console.log('💰 API totalRevenue || 0:', apiStats.totalRevenue || 0);
    
    const stats = {
      totalSalesPersons: salesPersons.length,
      totalQuotations: salesPersons.reduce((sum: number, person: any) => sum + person.quotationCount, 0),
      activeUsers: salesPersons.filter((person: any) => person.quotationCount > 0).length,
      topPerformers: salesPersons.filter((person: any) => person.quotationCount > 0).slice(0, 3),
      totalRevenue: apiStats.totalRevenue || 0,
      averageQuotationsPerUser: apiStats.averageQuotationsPerUser || 0,
      quotationsByMonth: apiStats.quotationsByMonth || []
    };

    console.log('🏁 Final stats object:', stats);
    console.log('💰 Final totalRevenue:', stats.totalRevenue);

    return {
      success: true,
      salesPersons,
      stats
    };
  }

  async saveQuotation(quotationData: any): Promise<{ success: boolean; message: string; quotationId: string }> {
    const response = await fetch(`${API_BASE_URL}/sales/quotation`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(quotationData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to save quotation');
    }

    return data;
  }

  async getSalesPersonDetails(salesPersonId: string): Promise<{ 
    success: boolean; 
    salesPerson: any; 
    customers: any[]; 
    totalQuotations: number; 
    totalCustomers: number 
  }> {
    console.log('🌐 API Call: getSalesPersonDetails for ID:', salesPersonId);
    const response = await fetch(`${API_BASE_URL}/sales/salesperson/${salesPersonId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    console.log('📡 API Response status:', response.status);
    const data = await response.json();
    console.log('📊 API Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get sales person details');
    }

    // Log specific quotation statuses from API response
    if (data.customers) {
      data.customers.forEach((customer: any, index: number) => {
        console.log(`🔍 API Customer ${index + 1}: ${customer.customerName}`);
        customer.quotations?.forEach((quotation: any, qIndex: number) => {
          console.log(`  📋 API Quotation ${qIndex + 1}: ${quotation.quotationId} - Status: ${quotation.status}`);
        });
      });
    }

    return data;
  }
}

export const salesAPI = new SalesAPI();

