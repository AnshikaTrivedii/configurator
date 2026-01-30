import axios from 'axios';
import { Client } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Get auth token from localStorage
const getAuthToken = () => {
    return localStorage.getItem('salesToken');
};

// Create axios instance with auth
const createAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface CreateClientRequest {
    name: string;
    email: string;
    phone: string;
    projectTitle?: string;
    location?: string;
    company?: string;
    city?: string;
    state?: string;
    country?: string;
    notes?: string;
}

export interface ClientSearchResponse {
    success: boolean;
    clients: Client[];
}

export interface ClientResponse {
    success: boolean;
    client: Client;
    message?: string;
}

export interface ClientsListResponse {
    success: boolean;
    clients: Client[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export const clientAPI = {
    // Create new client
    async createClient(data: CreateClientRequest): Promise<ClientResponse> {
        const response = await axios.post(
            `${API_URL}/clients`,
            data,
            { headers: createAuthHeaders() }
        );
        return response.data;
    },

    // Search clients by name, email, company, or location
    async searchClients(query: string): Promise<ClientSearchResponse> {
        const response = await axios.get(
            `${API_URL}/clients/search`,
            {
                params: { q: query },
                headers: createAuthHeaders()
            }
        );
        return response.data;
    },

    // Get all clients with pagination
    async getClients(page: number = 1, limit: number = 50): Promise<ClientsListResponse> {
        const response = await axios.get(
            `${API_URL}/clients`,
            {
                params: { page, limit },
                headers: createAuthHeaders()
            }
        );
        return response.data;
    },

    // Get client by ID
    async getClientById(id: string): Promise<ClientResponse> {
        const response = await axios.get(
            `${API_URL}/clients/${id}`,
            { headers: createAuthHeaders() }
        );
        return response.data;
    },

    // Update client
    async updateClient(id: string, data: Partial<CreateClientRequest>): Promise<ClientResponse> {
        const response = await axios.put(
            `${API_URL}/clients/${id}`,
            data,
            { headers: createAuthHeaders() }
        );
        return response.data;
    },

    // Delete client
    async deleteClient(id: string): Promise<{ success: boolean; message: string }> {
        const response = await axios.delete(
            `${API_URL}/clients/${id}`,
            { headers: createAuthHeaders() }
        );
        return response.data;
    },

    // Find or create client
    async findOrCreateClient(data: CreateClientRequest): Promise<ClientResponse> {
        try {
            // Try to find existing client by email
            const searchResponse = await this.searchClients(data.email);

            if (searchResponse.clients && searchResponse.clients.length > 0) {
                const existingClient = searchResponse.clients.find(
                    c => c.email.toLowerCase() === data.email.toLowerCase()
                );

                if (existingClient) {
                    return {
                        success: true,
                        client: existingClient,
                        message: 'Existing client found'
                    };
                }
            }

            // Create new client if not found
            return await this.createClient(data);
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Error finding or creating client');
        }
    }
};
