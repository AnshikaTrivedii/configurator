import express from 'express';
import Client from '../models/Client.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create new client
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, projectTitle, location, company, address, city, state, country, notes } = req.body;

        // Validate required fields
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required'
            });
        }

        // Check if client with this email already exists
        const existingClient = await Client.findOne({ email: email.toLowerCase() });
        if (existingClient) {
            return res.status(200).json({
                success: true,
                client: existingClient,
                message: 'Client already exists'
            });
        }

        // Create new client
        const client = new Client({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            projectTitle: projectTitle?.trim() || '',
            location: location?.trim() || '',
            company: company?.trim() || '',
            city: city?.trim() || '',
            state: state?.trim() || '',
            country: country?.trim() || 'India',
            notes: notes?.trim() || ''
        });

        await client.save();

        res.status(201).json({
            success: true,
            client,
            message: 'Client created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating client',
            error: error.message
        });
    }
});

// Get client leads (clients with unassigned quotations)
router.get('/leads', authenticateToken, async (req, res) => {
    try {
        const Quotation = (await import('../models/Quotation.js')).default;

        // Find all quotations with no salesUserId
        const unassignedQuotations = await Quotation.find({ salesUserId: null });

        // Extract unique client IDs
        const clientIds = [...new Set(unassignedQuotations.map(q => q.clientId).filter(id => id))];

        // Fetch clients
        const leads = await Client.find({ _id: { $in: clientIds } }).sort({ createdAt: -1 });

        res.json({
            success: true,
            leads
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leads',
            error: error.message
        });
    }
});

// Get all clients with pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const clients = await Client.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Client.countDocuments();

        res.json({
            success: true,
            clients,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching clients',
            error: error.message
        });
    }
});

// Search clients by name, email, company, or location
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim() === '') {
            return res.json({ success: true, clients: [] });
        }

        const searchQuery = q.trim();

        // Search using text index and regex for flexible matching
        const clients = await Client.find({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { company: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } },
                { location: { $regex: searchQuery, $options: 'i' } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            clients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error searching clients',
            error: error.message
        });
    }
});

// Get client by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            client
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching client',
            error: error.message
        });
    }
});

// Update client
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone, projectTitle, location, company, city, state, country, notes } = req.body;

        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Update fields
        if (name) client.name = name.trim();
        if (email) client.email = email.toLowerCase().trim();
        if (phone) client.phone = phone.trim();
        if (projectTitle !== undefined) client.projectTitle = projectTitle.trim();
        if (location !== undefined) client.location = location.trim();
        if (company !== undefined) client.company = company.trim();
        if (city !== undefined) client.city = city.trim();
        if (state !== undefined) client.state = state.trim();
        if (country !== undefined) client.country = country.trim();
        if (notes !== undefined) client.notes = notes.trim();

        await client.save();

        res.json({
            success: true,
            client,
            message: 'Client updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating client',
            error: error.message
        });
    }
});

// Delete client (only if no quotations exist)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        // Check if client has any quotations
        const Quotation = (await import('../models/Quotation.js')).default;
        const quotationCount = await Quotation.countDocuments({ clientId: client._id });

        if (quotationCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete client. ${quotationCount} quotation(s) exist for this client.`
            });
        }

        await client.deleteOne();

        res.json({
            success: true,
            message: 'Client deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting client',
            error: error.message
        });
    }
});

export default router;
