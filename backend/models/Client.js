import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    projectTitle: {
        type: String,
        trim: true,
        default: ''
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    company: {
        type: String,
        trim: true,
        default: ''
    },
    city: {
        type: String,
        trim: true,
        default: ''
    },
    state: {
        type: String,
        trim: true,
        default: ''
    },
    country: {
        type: String,
        trim: true,
        default: 'India'
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for faster queries
clientSchema.index({ name: 1, email: 1 });
clientSchema.index({ createdAt: -1 });

// Text index for search functionality
clientSchema.index({
    name: 'text',
    email: 'text',
    company: 'text',
    location: 'text'
});

export default mongoose.model('Client', clientSchema);
