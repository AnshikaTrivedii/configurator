const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface QuoteQuery {
  _id: string;
  quoteId: string;
  createdAt: string;
  
  // CUSTOMER INFORMATION
  customerName: string;
  email: string;
  phone: string;
  
  // PRODUCT INFORMATION
  productId: string;
  productName: string;
  category: string;
  pixelPitch: number;
  
  // DISPLAY SPECIFICATIONS
  resolution: {
    width: number;
    height: number;
  };
  cabinetDimensions: {
    width: number;
    height: number;
  };
  moduleDimensions: {
    width: number;
    height: number;
  };
  moduleResolution: {
    width: number;
    height: number;
  };
  moduleQuantity: number;
  displaySize?: {
    width: number;
    height: number;
  };
  aspectRatio?: string;
  
  // TECHNICAL SPECIFICATIONS
  pixelDensity: number;
  brightness: number;
  refreshRate: number;
  environment: string;
  maxPowerConsumption: number;
  avgPowerConsumption: number;
  weightPerCabinet: number;
  
  // DISPLAY CONFIGURATION
  cabinetGrid?: {
    rows: number;
    columns: number;
  };
  
  // ADDITIONAL OPTIONS
  processor?: string;
  mode?: string;
  
  // CUSTOMER MESSAGE
  message: string;
  
  // User type
  userType?: string;
  
  // Status
  status?: string;
  
  // Assignment fields
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  assignedAt?: string;
}

export interface QuoteQueriesResponse {
  success: boolean;
  data: {
    quotes: QuoteQuery[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface QuoteQueryResponse {
  success: boolean;
  data: QuoteQuery;
}

class AdminAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('salesToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get all quote queries with pagination
   */
  async getQuoteQueries(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<QuoteQueriesResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.status) queryParams.append('status', params.status);

      const url = `${API_BASE_URL}/admin/quotes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch quote queries');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching quote queries:', error);
      throw error;
    }
  }

  /**
   * Get single quote query by ID
   */
  async getQuoteQuery(quoteId: string): Promise<QuoteQueryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/quotes/${quoteId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch quote query');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching quote query:', error);
      throw error;
    }
  }

  /**
   * Assign quote query to a sales user
   */
  async assignQuote(quoteId: string, salesUserId: string): Promise<QuoteQueryResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/quotes/${quoteId}/assign`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ salesUserId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Error assigning quote:', error);
      throw error;
    }
  }
}

export const adminAPI = new AdminAPI();

