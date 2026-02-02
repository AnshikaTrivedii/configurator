import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Lead Type Definition
export interface Lead {
    _id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
    projectTitle?: string;
    location?: string;

    productName: string;
    productDetails: any;
    message?: string;

    status: 'New' | 'Assigned' | 'Contacted' | 'Converted' | 'Lost';
    assignedSalesUserId?: string;
    assignedSalesUserName?: string;

    createdAt: string;
    isPublicRequest: boolean;
}

// API Service
export const leadsAPI = {
    // Create new public lead
    async createPublicLead(data: any): Promise<{ success: boolean; message: string; lead: Lead }> {
        const response = await axios.post(`${API_URL}/leads/public`, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    },

    // Get all leads (Admin/Sales)
    async getLeads(status?: string, assignedTo?: string): Promise<{ success: boolean; leads: Lead[] }> {
        const token = localStorage.getItem('salesToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const params: any = {};
        if (status) params.status = status;
        if (assignedTo) params.assignedTo = assignedTo;

        const response = await axios.get(`${API_URL}/leads`, {
            headers,
            params
        });
        return response.data;
    },

    // Assign a lead
    async assignLead(leadId: string, salesUserId: string): Promise<{ success: boolean; message: string; lead: Lead }> {
        const token = localStorage.getItem('salesToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await axios.post(`${API_URL}/leads/assign`,
            { leadId, salesUserId },
            { headers }
        );
        return response.data;
    },

    // Update lead status
    async updateStatus(leadId: string, status: string): Promise<{ success: boolean; message: string; lead: Lead }> {
        const token = localStorage.getItem('salesToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await axios.put(`${API_URL}/leads/${leadId}/status`,
            { status },
            { headers }
        );
        return response.data;
    }
};
