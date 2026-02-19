const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SalesUser {
  _id?: string; // CRITICAL: User ID needed for quotation attribution
  email: string;
  name: string;
  location: string;
  contactNumber: string;
  role?: 'sales' | 'super' | 'super_admin' | 'partner';
  allowedCustomerTypes?: string[]; // For partners: ['endUser', 'reseller', 'siChannel']
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
    try {

      const response = await fetch(`${API_BASE_URL}/sales/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok && response.status === 0) {

        throw new Error('Failed to connect to server. Please check if the backend is running on port 3001.');
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);

      } catch (jsonError) {

        throw new Error(`Invalid response from server (${response.status}). Please check if the backend is running and accessible.`);
      }

      if (!response.ok) {

        if (response.status === 400) {
          throw new Error(data.message || 'Invalid email or password. Please check your credentials.');
        } else if (response.status === 401) {
          throw new Error(data.message || 'Authentication failed. Please check your credentials.');
        } else if (response.status === 502) {

          throw new Error(
            `Backend server is unreachable (502 Bad Gateway).\n\n` +
            `This usually means:\n` +
            `1. Backend server is down or not running\n` +
            `2. Backend URL is incorrect: ${API_BASE_URL}\n` +
            `3. Network/firewall is blocking the connection\n\n` +
            `Please check:\n` +
            `- Backend server status\n` +
            `- VITE_API_URL environment variable in Netlify dashboard\n` +
            `- Backend server logs for errors`
          );
        } else if (response.status === 500) {
          throw new Error(data.message || 'Server error. Please try again later.');
        } else if (response.status === 404) {
          throw new Error('Login endpoint not found. Please check if the backend API is configured correctly.');
        } else {
          throw new Error(data.message || `Login failed with status ${response.status}. Please try again.`);
        }
      }

      if (data.success && data.user) {
        this.setUserCache(data.user);

      }

      return data;
    } catch (error: any) {

      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {

          throw new Error('Cannot connect to backend server. Please ensure:\n1. Backend server is running on port 3001\n2. Backend URL is correct: ' + API_BASE_URL + '\n3. No firewall is blocking the connection\n4. Test backend: Open http://localhost:3001/health in browser');
        }
        if (error.message.includes('CORS')) {

          throw new Error('CORS error: Backend server is not allowing requests from this origin. Please check CORS configuration in backend/server.js');
        }
      }

      throw error;
    }
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

    if (data.success && data.user) {
      this.setUserCache(data.user);
    }

    return data;
  }

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

    const url = `${API_BASE_URL}/sales/dashboard?t=${Date.now()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {

      throw new Error(data.message || 'Failed to get sales persons data');
    }

    const salesPersons = data.data || [];
    const apiStats = data.stats || {};

    const stats = {
      totalSalesPersons: salesPersons.length,
      totalQuotations: salesPersons.reduce((sum: number, person: any) => sum + person.quotationCount, 0),
      activeUsers: salesPersons.filter((person: any) => person.quotationCount > 0).length,
      topPerformers: salesPersons.filter((person: any) => person.quotationCount > 0).slice(0, 3),
      totalRevenue: apiStats.totalRevenue || 0,
      averageQuotationsPerUser: apiStats.averageQuotationsPerUser || 0,
      quotationsByMonth: apiStats.quotationsByMonth || []
    };

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

    const url = `${API_BASE_URL}/sales/salesperson/${salesPersonId}?t=${Date.now()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get sales person details');
    }

    if (data.customers) {
      data.customers.forEach((customer: any, index: number) => {

        customer.quotations?.forEach((quotation: any, qIndex: number) => {

        });
      });
    }

    return data;
  }

  async getMyDashboard(): Promise<{
    success: boolean;
    salesPerson: any;
    customers: any[];
    totalQuotations: number;
    totalCustomers: number;
    totalRevenue: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/sales/my-dashboard`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get sales dashboard data');
    }

    return data;
  }

  /**
   * Convert PDF Blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1]; // Remove data:application/pdf;base64, prefix
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Upload PDF to S3 for an existing quotation
   */
  async uploadQuotationPdf(quotationId: string, pdfBlob: Blob): Promise<{
    success: boolean;
    pdfS3Key: string;
    pdfS3Url: string;
    message: string;
  }> {
    try {

      const pdfBase64 = await this.blobToBase64(pdfBlob);

      const response = await fetch(`${API_BASE_URL}/sales/quotation/${encodeURIComponent(quotationId)}/upload-pdf`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ pdfBase64 })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload PDF to S3');
      }

      return data;
    } catch (error: any) {

      throw error;
    }
  }

  /**
   * Get presigned URL for PDF from S3
   */
  async getQuotationPdfUrl(quotationId: string): Promise<{
    success: boolean;
    pdfS3Url: string;
    pdfS3Key: string;
  }> {

    const response = await fetch(`${API_BASE_URL}/sales/quotation/${encodeURIComponent(quotationId)}/pdf-url?t=${Date.now()}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get PDF URL');
    }

    return data;
  }

  async updateQuotation(quotationId: string, updateData: any): Promise<{ success: boolean; message: string; quotation: any }> {
    const response = await fetch(`${API_BASE_URL}/sales/quotation/update`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ...updateData, quotationId })
    });

    const data = await response.json();

    if (!response.ok) {

      throw new Error(data.message || 'Failed to update quotation');
    }

    return data;
  }

  async deleteQuotation(quotationId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/sales/quotation/${encodeURIComponent(quotationId)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {

      throw new Error(data.message || 'Failed to delete quotation');
    }

    return data;
  }
  /**
   * Register a new user (admin only)
   */
  async registerUser(userData: any): Promise<{ success: boolean; message: string; user: SalesUser }> {
    const response = await fetch(`${API_BASE_URL}/sales/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to register user');
    }

    return data;
  }

  async createPublicQuotation(quoteData: any): Promise<{ success: boolean; message: string; quotation: any }> {
    const response = await fetch(`${API_BASE_URL}/sales/public/quotation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quoteData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit quote request');
    }

    return data;
  }

  async assignLeads(clientId: string, salesUserId: string): Promise<{ success: boolean; message: string; result: any }> {
    const response = await fetch(`${API_BASE_URL}/sales/assign`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ clientId, salesUserId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to assign leads');
    }

    return data;
  }
}

export const salesAPI = new SalesAPI();

