import React, { useState, useEffect, useRef } from 'react';
import { Users, FileText, MapPin, Download, RefreshCw, Briefcase, Mail, Phone, Calendar, UserCheck } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { leadsAPI, Lead } from '../api/leads';
import { SalesPersonDetailsModal } from './SalesPersonDetailsModal';
import { AddUserModal } from './AddUserModal';

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role: string;
  allowedCustomerTypes?: string[]; // For partners
  quotationCount: number;
  revenue?: number;
  lastLogin?: string;
  createdAt: string;
}

interface DashboardStats {
  totalSalesPersons: number;
  totalQuotations: number;
  activeUsers: number;
  topPerformers: SalesPerson[];
  totalRevenue: number;
  averageQuotationsPerUser: number;
  quotationsByMonth: Array<{
    _id: { year: number; month: number };
    count: number;
    revenue: number;
  }>;
}

interface SuperUserDashboardProps {
  onBack: () => void;
  loggedInUser?: {
    role?: string;
    name?: string;
    email?: string;
  };
}

export const SuperUserDashboard: React.FC<SuperUserDashboardProps> = ({ onBack, loggedInUser }) => {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    location: '',
    dateRange: '',
    search: ''
  });
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const isFetchingRef = useRef(false);

  // Leads Management State
  const [activeTab, setActiveTab] = useState<'team' | 'leads'>('team');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [assignSalesPersonId, setAssignSalesPersonId] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoadingLeads(true);
      const response = await leadsAPI.getLeads();
      if (response.success) {
        setLeads(response.leads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleAssignLead = async () => {
    if (!selectedLead || !assignSalesPersonId) return;

    try {
      setLoading(true);
      await leadsAPI.assignLead(selectedLead._id, assignSalesPersonId);
      alert('Lead assigned successfully');
      setAssignModalOpen(false);
      setSelectedLead(null);
      setAssignSalesPersonId('');
      fetchLeads(); // Refresh leads
      fetchDashboardData(); // Refresh stats
    } catch (error: any) {
      alert('Failed to assign lead: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (forceRefresh = false) => {
    if (isFetching()) {
      return;
    }
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);

      const response = await salesAPI.getSalesPersons();

      setSalesPersons(response.salesPersons || []);
      setStats(response.stats || null);
      setLastRefreshTime(new Date());
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const isFetching = () => isFetchingRef.current;

  const filteredSalesPersons = salesPersons.filter(person => {
    const matchesLocation = !filters.location || person.location.toLowerCase().includes(filters.location.toLowerCase());
    const matchesSearch = !filters.search ||
      person.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      person.email.toLowerCase().includes(filters.search.toLowerCase());

    return matchesLocation && matchesSearch;
  });

  const handleSalesPersonClick = (salesPersonId: string) => {
    setSelectedSalesPersonId(salesPersonId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedSalesPersonId(null);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Location', 'Contact Number', 'Valid Quotations (Converted/In Progress)', 'Revenue (₹)', 'Last Login', 'Created At'],
      ...filteredSalesPersons.map(person => [
        person.name,
        person.email,
        person.location,
        person.contactNumber,
        person.quotationCount.toString(),
        (person.revenue || 0).toString(),
        person.lastLogin || 'Never',
        new Date(person.createdAt).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-team-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openAssignModal = (lead: Lead) => {
    setSelectedLead(lead);
    setAssignModalOpen(true);
  };

  if (loading && !salesPersons.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchDashboardData()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super User Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage and monitor sales team performance</p>
              {lastRefreshTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Add User
              </button>
              <button
                onClick={() => fetchDashboardData(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Force Refresh'}
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Configurator
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sales Persons</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSalesPersons}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Quotations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuotations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average per User</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.averageQuotationsPerUser || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{stats.totalRevenue?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'team' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('team')}
          >
            Sales Team
          </button>
          <button
            className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'leads' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('leads')}
          >
            Client Leads
            {leads.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{leads.length}</span>
            )}
          </button>
        </div>

        {activeTab === 'team' ? (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter by location..."
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Persons Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name / Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valid Quotations*
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSalesPersons.map((person) => (
                      <tr key={person._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <button
                                onClick={() => handleSalesPersonClick(person._id)}
                                className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                              >
                                {person.name}
                              </button>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">{person.role === 'partner' ? 'Partner' : person.role === 'sales' ? 'Sales' : person.role || 'Sales'}</span>
                                {person.role === 'partner' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Partner
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{person.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">{person.location}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {person.contactNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">{person.quotationCount}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${person.quotationCount > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {person.quotationCount > 0 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Client Leads Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Client Leads</h3>
                <p className="mt-1 text-sm text-gray-500">Manage and assign client leads.</p>
              </div>
              <button onClick={() => fetchLeads()} className="p-2 bg-white rounded-full hover:bg-gray-100">
                <RefreshCw className={`w-5 h-5 text-gray-500 ${loadingLeads ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingLeads ? (
              <div className="text-center py-10">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No unassigned leads found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product / Interest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          {lead.company && <div className="text-xs text-gray-500">{lead.company}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {lead.email}</div>
                          <div className="flex items-center mt-1"><Phone className="w-3 h-3 mr-1" /> {lead.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="font-medium text-gray-900">{lead.productName}</div>
                          {lead.projectTitle && <div className="text-xs text-gray-500">Proj: {lead.projectTitle}</div>}
                          {lead.location && <div className="flex items-center mt-1 text-xs"><MapPin className="w-3 h-3 mr-1" /> {lead.location}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mb-1 ${lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'Assigned' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {lead.status}
                          </span>
                          <div className="text-sm text-gray-900 font-medium">
                            {lead.assignedSalesUserName || 'Unassigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(lead.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openAssignModal(lead)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <UserCheck className="w-3 h-3 mr-1" /> {lead.assignedSalesUserName ? 'Reassign' : 'Assign'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sales Person Details Modal */}
      <SalesPersonDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        salesPersonId={selectedSalesPersonId}
        loggedInUser={loggedInUser}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={() => {
          fetchDashboardData(true);
          setIsAddUserModalOpen(false);
        }}
      />

      {/* Assign Lead Modal */}
      {assignModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Assign Lead</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-500 mb-1">Client</p>
              <p className="text-lg font-semibold text-gray-900">{selectedLead.name}</p>
              <p className="text-sm text-gray-500">{selectedLead.email}</p>
              <p className="text-sm text-gray-500 mt-2 italic">This will assign the client and all their unassigned quotations.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Sales Person</label>
              <select
                className="w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border"
                value={assignSalesPersonId}
                onChange={(e) => setAssignSalesPersonId(e.target.value)}
              >
                <option value="">Select a sales person...</option>
                {salesPersons.map(sp => (
                  <option key={sp._id} value={sp._id}>{sp.name} ({sp.email})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignLead}
                disabled={!assignSalesPersonId || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};