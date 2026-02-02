import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
    // Contact Information
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        trim: true
    },
    projectTitle: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },

    // Product Interest
    productName: {
        type: String,
        required: true
    },
    productDetails: {
        type: mongoose.Schema.Types.Mixed, // Stores the full configuration object
        required: true
    },
    message: {
        type: String,
        trim: true
    },

    // Assignment & Status
    status: {
        type: String,
        enum: ['New', 'Assigned', 'Contacted', 'Converted', 'Lost'],
        default: 'New',
        index: true
    },
    assignedSalesUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SalesUser',
        default: null,
        index: true
    },
    assignedSalesUserName: {
        type: String,
        default: 'Unassigned'
    },

    // Tracking
    isPublicRequest: {
        type: Boolean,
        default: true
    },
    source: {
        type: String,
        default: 'Web Configurator'
    }
}, {
    timestamps: true
});

// Indexes for common queries
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedSalesUserId: 1 });

export default mongoose.model('Lead', leadSchema);
