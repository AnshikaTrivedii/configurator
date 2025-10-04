import React, { useState, useEffect } from 'react';
import { Users, FileText, MapPin, Download, RefreshCw } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { SalesPersonDetailsModal } from './SalesPersonDetailsModal';

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role: string;
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
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds to show new quotations
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...');
      fetchDashboardData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching dashboard data...');
      console.log('🔑 Auth token present:', !!localStorage.getItem('salesToken'));
      
      // Fetch sales persons data
      const response = await salesAPI.getSalesPersons();
      console.log('📊 Dashboard API response:', response);
      console.log('👥 Sales persons:', response.salesPersons?.length || 0);
      console.log('📈 Stats:', response.stats);
      console.log('💰 Total Revenue from API:', response.stats?.totalRevenue);
      console.log('📊 Total Quotations from API:', response.stats?.totalQuotations);
      
      setSalesPersons(response.salesPersons || []);
      setStats(response.stats || null);
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
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
              onClick={fetchDashboardData}
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
                  Last updated: {lastRefreshTime.toLocaleTimeString()} (Auto-refresh every 30s)
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchDashboardData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
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

        {/* Top Performers Section */}
        {stats && stats.topPerformers && stats.topPerformers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                🏆 Top Performer{stats.topPerformers.length > 1 ? 's' : ''}
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                Based on Converted & In Progress quotations
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.topPerformers.map((performer) => (
                <div key={performer._id} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {performer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{performer.name}</p>
                      <p className="text-xs text-gray-500 truncate">{performer.email}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-orange-600">
                            {performer.quotationCount} valid quotation{performer.quotationCount !== 1 ? 's' : ''}
                          </p>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            {performer.location}
                          </span>
                        </div>
                        {performer.revenue && performer.revenue > 0 && (
                          <p className="text-xs font-medium text-green-600">
                            Revenue: ₹{performer.revenue.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Locations</option>
                <option value="delhi">Delhi</option>
                <option value="mumbai">Mumbai</option>
                <option value="hyderabad">Hyderabad</option>
                <option value="lucknow">Lucknow</option>
              </select>
            </div>
            <div className="min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Persons Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sales Team</h3>
            <p className="text-sm text-gray-600">Showing {filteredSalesPersons.length} of {salesPersons.length} sales persons</p>
            <p className="text-xs text-gray-500 mt-1">*Valid quotations include only 'Converted' and 'In Progress' statuses</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Person
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
                            onClick={() => {
                              console.log('Sales person clicked:', person._id, person.name);
                              handleSalesPersonClick(person._id);
                            }}
                            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                          >
                            {person.name}
                          </button>
                          <div className="text-sm text-gray-500">{person.role}</div>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        person.quotationCount > 0 
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
      </div>

      {/* Sales Person Details Modal */}
      <SalesPersonDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        salesPersonId={selectedSalesPersonId}
        loggedInUser={loggedInUser}
      />
    </div>
  );
};