const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SalesUser {
  email: string;
  name: string;
  location: string;
  contactNumber: string;
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
    const response = await fetch(`${API_BASE_URL}/sales/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get profile');
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
  }

  setAuthData(token: string, user: SalesUser): void {
    localStorage.setItem('salesToken', token);
    localStorage.setItem('salesUser', JSON.stringify(user));
  }
}

export const salesAPI = new SalesAPI();

