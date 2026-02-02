import express from 'express';
import Lead from '../models/Lead.js';
import SalesUser from '../models/SalesUser.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public route to create a new lead
router.post('/public', async (req, res) => {
    try {
        const {
            customerName,
            customerEmail,
            customerPhone,
            customerProject,
            customerLocation,
            message,
            productName,
            productDetails
        } = req.body;

        // Basic validation
        if (!customerName || !customerEmail || !productName) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and product name are required'
            });
        }

        const lead = new Lead({
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            projectTitle: customerProject,
            location: customerLocation,
            message: message,
            productName: productName,
            productDetails: productDetails,
            status: 'New',
            isPublicRequest: true
        });

        await lead.save();

        res.status(201).json({
            success: true,
            message: 'Quote request submitted successfully',
            lead: {
                _id: lead._id,
                name: lead.name,
                email: lead.email
            }
        });

    } catch (error) {
        console.error('Error creating public lead:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit quote request',
            error: error.message
        });
    }
});

// Admin/Sales route to get all leads
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Build filters based on query params if needed
        const { status, assignedTo } = req.query;
        let query = {};

        if (status) query.status = status;
        if (assignedTo === 'unassigned') query.assignedSalesUserId = null;
        else if (assignedTo) query.assignedSalesUserId = assignedTo;

        // Fetch leads, sorted by newest first
        const leads = await Lead.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            leads
        });

    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leads',
            error: error.message
        });
    }
});

// Admin route to assign a lead
router.post('/assign', authenticateToken, async (req, res) => {
    try {
        const { leadId, salesUserId } = req.body;

        if (!leadId || !salesUserId) {
            return res.status(400).json({
                success: false,
                message: 'Lead ID and Sales User ID are required'
            });
        }

        // Validate Sales User
        const salesUser = await SalesUser.findById(salesUserId);
        if (!salesUser) {
            return res.status(404).json({
                success: false,
                message: 'Sales User not found'
            });
        }

        // Update Lead
        const lead = await Lead.findByIdAndUpdate(
            leadId,
            {
                assignedSalesUserId: salesUser._id,
                assignedSalesUserName: salesUser.name,
                status: 'Assigned'
            },
            { new: true } // Return updated doc
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.json({
            success: true,
            message: `Lead assigned to ${salesUser.name}`,
            lead
        });

    } catch (error) {
        console.error('Error assigning lead:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign lead',
            error: error.message
        });
    }
});

// Update lead status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['New', 'Assigned', 'Contacted', 'Converted', 'Lost'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const lead = await Lead.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.json({
            success: true,
            message: 'Lead status updated successfully',
            lead
        });

    } catch (error) {
        console.error('Error updating lead status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update lead status',
            error: error.message
        });
    }
});

// Delete a lead (Admin only, or maybe just for cleanup)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Check permissions (Super Admin only)
        if (req.user.role !== 'super' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super Admin role required.'
            });
        }

        const deletedLead = await Lead.findByIdAndDelete(req.params.id);

        if (!deletedLead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.json({
            success: true,
            message: 'Lead deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete lead',
            error: error.message
        });
    }
});

export default router;
