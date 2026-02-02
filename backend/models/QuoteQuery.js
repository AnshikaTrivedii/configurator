import mongoose from 'mongoose';

const quoteQuerySchema = new mongoose.Schema({
  quoteId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // CUSTOMER INFORMATION
  customerName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  phone: {
    type: String,
    required: true
  },
  
  // PRODUCT INFORMATION
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true
  },
  pixelPitch: {
    type: Number,
    required: true
  },
  
  // DISPLAY SPECIFICATIONS
  resolution: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  cabinetDimensions: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  moduleDimensions: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  moduleResolution: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },
  moduleQuantity: {
    type: Number,
    required: true
  },
  displaySize: {
    width: {
      type: Number,
      required: false
    },
    height: {
      type: Number,
      required: false
    }
  },
  aspectRatio: {
    type: String,
    required: false
  },
  
  // TECHNICAL SPECIFICATIONS
  pixelDensity: {
    type: Number,
    required: true
  },
  brightness: {
    type: Number,
    required: true
  },
  refreshRate: {
    type: Number,
    required: true
  },
  environment: {
    type: String,
    required: true
  },
  maxPowerConsumption: {
    type: Number,
    required: true
  },
  avgPowerConsumption: {
    type: Number,
    required: true
  },
  weightPerCabinet: {
    type: Number,
    required: true
  },
  
  // DISPLAY CONFIGURATION
  cabinetGrid: {
    rows: {
      type: Number,
      required: false
    },
    columns: {
      type: Number,
      required: false
    }
  },
  
  // ADDITIONAL OPTIONS
  processor: {
    type: String,
    required: false
  },
  mode: {
    type: String,
    required: false
  },
  
  // CUSTOMER MESSAGE
  message: {
    type: String,
    default: ''
  },
  
  // User type for reference
  userType: {
    type: String,
    enum: ['endUser', 'siChannel', 'reseller'],
    required: false
  },
  
  // Future extensibility: status tracking
  status: {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new',
    index: true
  },
  
  // ASSIGNMENT FIELDS
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesUser',
    required: false,
    index: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesUser',
    required: false
  },
  assignedAt: {
    type: Date,
    required: false,
    index: true
  }
}, {
  timestamps: true
});

// Index for faster queries
quoteQuerySchema.index({ createdAt: -1 });
quoteQuerySchema.index({ productName: 1, createdAt: -1 });
quoteQuerySchema.index({ status: 1, createdAt: -1 });
quoteQuerySchema.index({ assignedTo: 1, createdAt: -1 }); // For sales user queries

export default mongoose.model('QuoteQuery', quoteQuerySchema);

