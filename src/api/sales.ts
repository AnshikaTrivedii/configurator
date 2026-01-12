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
    try {
      console.log('🔐 ========== LOGIN ATTEMPT ==========');
      console.log('🔐 API Base URL:', API_BASE_URL);
      console.log('🔐 Full Login URL:', `${API_BASE_URL}/sales/login`);
      console.log('📧 Email:', email);
      console.log('🔐 Environment:', import.meta.env.MODE);
      console.log('🔐 VITE_API_URL:', import.meta.env.VITE_API_URL);
      
      const response = await fetch(`${API_BASE_URL}/sales/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      // Handle network errors (CORS, connection refused, etc.)
      if (!response.ok && response.status === 0) {
        console.error('❌ Network error: Response status is 0');
        throw new Error('Failed to connect to server. Please check if the backend is running on port 3001.');
      }

      // Read response as text first so we can use it for both JSON parsing and error messages
      const responseText = await response.text();
      console.log('📄 Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📦 Response data:', data);
      } catch (jsonError) {
        console.error('❌ JSON parse error:', jsonError);
        console.error('📄 Response text that failed to parse:', responseText);
        throw new Error(`Invalid response from server (${response.status}). Please check if the backend is running and accessible.`);
      }

      if (!response.ok) {
        console.error('❌ Login failed:', data);
        // Provide more specific error messages
        if (response.status === 400) {
          throw new Error(data.message || 'Invalid email or password. Please check your credentials.');
        } else if (response.status === 401) {
          throw new Error(data.message || 'Authentication failed. Please check your credentials.');
        } else if (response.status === 502) {
          // 502 Bad Gateway - backend is unreachable
          console.error('❌ 502 Bad Gateway - Backend server is unreachable');
          console.error('❌ API URL being used:', API_BASE_URL);
          console.error('❌ VITE_API_URL env var:', import.meta.env.VITE_API_URL);
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

      // Cache user data for faster subsequent access
      if (data.success && data.user) {
        this.setUserCache(data.user);
        console.log('✅ Login successful for user:', data.user.email);
      }

      return data;
    } catch (error: any) {
      console.error('❌ ========== LOGIN ERROR ==========');
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Full error object:', error);
      console.error('❌ API Base URL:', API_BASE_URL);
      console.error('❌ =================================');
      
      // Handle network errors (fetch failed completely - CORS, connection refused, etc.)
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          console.error('❌ Network error detected - Backend server may not be running or accessible');
          console.error('❌ Trying to connect to:', `${API_BASE_URL}/sales/login`);
          throw new Error('Cannot connect to backend server. Please ensure:\n1. Backend server is running on port 3001\n2. Backend URL is correct: ' + API_BASE_URL + '\n3. No firewall is blocking the connection\n4. Test backend: Open http://localhost:3001/health in browser');
        }
        if (error.message.includes('CORS')) {
          console.error('❌ CORS error detected');
          throw new Error('CORS error: Backend server is not allowing requests from this origin. Please check CORS configuration in backend/server.js');
        }
      }
      
      // Re-throw other errors with their original messages
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
    // PRODUCTION DEBUG: Log the exact payload being sent to backend
    console.log('📤 API CALL - saveQuotation:', {
      environment: import.meta.env.MODE,
      apiBaseUrl: API_BASE_URL,
      salesUserId: quotationData.salesUserId,
      salesUserIdType: typeof quotationData.salesUserId,
      salesUserName: quotationData.salesUserName,
      quotationId: quotationData.quotationId,
      payloadKeys: Object.keys(quotationData),
      timestamp: new Date().toISOString()
    });
    
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
    
    // Add cache-busting parameter to ensure fresh data
    const url = `${API_BASE_URL}/sales/salesperson/${salesPersonId}?t=${Date.now()}`;
    console.log('🔗 Final URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    console.log('📡 API Response status:', response.status);
    const data = await response.json();
    console.log('📊 API Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get sales person details');
    }

    // Log specific quotation pricing from API response
    if (data.customers) {
      data.customers.forEach((customer: any, index: number) => {
        console.log(`🔍 API Customer ${index + 1}: ${customer.customerName}`);
        customer.quotations?.forEach((quotation: any, qIndex: number) => {
          console.log(`  📋 API Quotation ${qIndex + 1}: ${quotation.quotationId} - Price: ₹${quotation.totalPrice?.toLocaleString('en-IN')}`);
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
      // Convert blob to base64
      const pdfBase64 = await this.blobToBase64(pdfBlob);

      const response = await fetch(`${API_BASE_URL}/sales/quotation/${quotationId}/upload-pdf`, {
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
      console.error('Error uploading PDF to S3:', error);
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
    const response = await fetch(`${API_BASE_URL}/sales/quotation/${quotationId}/pdf-url`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get PDF URL');
    }

    return data;
  }
}

export const salesAPI = new SalesAPI();

