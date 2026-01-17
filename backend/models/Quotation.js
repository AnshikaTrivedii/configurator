import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  quotationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesUser',
    required: true
  },
  salesUserName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productDetails: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  userType: {
    type: String,
    enum: ['endUser', 'siChannel', 'reseller'],
    required: true
  },
  userTypeDisplayName: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  originalTotalPrice: {
    type: Number,
    required: false,
    default: 0
  },
  pdfPage6HTML: {
    type: String,
    required: false
  },
  // S3 storage for PDF files
  pdfS3Key: {
    type: String,
    required: false,
    index: true
  },
  pdfS3Url: {
    type: String,
    required: false
  },
  // Store exact quotation data as shown on the page
  exactPricingBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  exactProductSpecs: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  quotationData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true
});

// Index for faster queries
quotationSchema.index({ salesUserId: 1, createdAt: -1 });
quotationSchema.index({ createdAt: -1 });

export default mongoose.model('Quotation', quotationSchema);
