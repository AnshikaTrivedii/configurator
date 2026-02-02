import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { Lead, leadsAPI } from '../api/leads';

interface LeadStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onStatusUpdated: () => void;
}

export const LeadStatusModal: React.FC<LeadStatusModalProps> = ({ isOpen, onClose, lead, onStatusUpdated }) => {
    const [status, setStatus] = useState<string>(lead?.status || 'New');
    const [loading, setLoading] = useState(false);

    // Update status when lead changes
    React.useEffect(() => {
        if (lead) {
            setStatus(lead.status);
        }
    }, [lead]);

    if (!isOpen || !lead) return null;

    const validStatuses = ['New', 'Assigned', 'Contacted', 'Converted', 'Lost'];

    const handleUpdate = async () => {
        try {
            setLoading(true);
            await leadsAPI.updateStatus(lead._id, status);
            alert('Lead status updated successfully');
            onStatusUpdated();
            onClose();
        } catch (error: any) {
            alert('Failed to update status: ' + (error.message || 'Unknown error'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm transform transition-all scale-100">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Change Status</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Update status for <span className="font-semibold">{lead.name}</span>
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg border"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {validStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading || status === lead.status}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                            Update
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
