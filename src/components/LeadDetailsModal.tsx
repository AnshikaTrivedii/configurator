import React from 'react';
import { X, Box, Monitor } from 'lucide-react';
import { Lead } from '../api/leads';

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({ isOpen, onClose, lead }) => {
    if (!isOpen || !lead) return null;

    // Helper to safely access nested properties
    const config = lead.productDetails?.config || {};
    const specs = lead.productDetails || {};

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Lead Details</h3>
                        <p className="text-sm text-gray-500">Configuration requested by {lead.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Client Info Summary */}
                    <div className="bg-blue-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Client</p>
                            <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                            <p className="text-sm text-gray-600">{lead.email}</p>
                            <p className="text-sm text-gray-600">{lead.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Project</p>
                            <p className="text-sm font-medium text-gray-900">{lead.projectTitle || 'N/A'}</p>
                            <p className="text-sm text-gray-600">{lead.location || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 border-t border-blue-100 pt-2 mt-2">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Message</p>
                            <p className="text-sm text-gray-700 italic">"{lead.message || 'No message provided'}"</p>
                        </div>
                    </div>

                    {/* Product Basic Info */}
                    <div>
                        <h4 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                            <Monitor className="w-5 h-5 mr-2 text-gray-500" />
                            Product Information
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500 w-1/3">Product Name</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{lead.productName}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500">Request Date</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Configuration */}
                    <div>
                        <h4 className="flex items-center text-lg font-semibold text-gray-900 mb-3">
                            <Box className="w-5 h-5 mr-2 text-gray-500" />
                            Configuration Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Display Config Dimensions if available */}
                            {config.width && config.height ? (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Dimensions</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Total Width:</span>
                                            <span className="text-sm font-medium">{config.width.toFixed(2)} {config.unit || 'm'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Total Height:</span>
                                            <span className="text-sm font-medium">{config.height.toFixed(2)} {config.unit || 'm'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Area:</span>
                                            <span className="text-sm font-medium">{(config.width * config.height).toFixed(2)} sq. {config.unit || 'm'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Display Cabinet Counts if available */}
                            {config.columns && config.rows ? (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cabinets</p>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Columns:</span>
                                            <span className="text-sm font-medium">{config.columns}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Rows:</span>
                                            <span className="text-sm font-medium">{config.rows}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                                            <span className="text-sm text-gray-600">Total Cabinets:</span>
                                            <span className="text-sm font-bold text-gray-900">{config.columns * config.rows}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Render any other interesting details from productDetails */}
                        <div className="mt-4 border rounded-lg overflow-hidden">
                            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-700">
                                Additional Specifications
                            </div>
                            <dl className="grid grid-cols-1 divide-y divide-gray-200">
                                {Object.entries(specs).map(([key, value]) => {
                                    // Skip complex objects we already handled or don't want to show raw
                                    if (key === 'config' || key === 'prices' || typeof value === 'object') return null;
                                    return (
                                        <div key={key} className="px-4 py-3 grid grid-cols-3 gap-4 hover:bg-gray-50">
                                            <dt className="text-sm font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                                            <dd className="text-sm text-gray-900 col-span-2">{String(value)}</dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
