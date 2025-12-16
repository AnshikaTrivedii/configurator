import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const salesUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  mustChangePassword: {
    type: Boolean,
    default: true
  },
  passwordSetAt: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['sales', 'super', 'super_admin', 'partner'],
    default: 'sales'
  },
  // Permissions for partners: which customer types they can see
  // Only used when role is 'partner'
  allowedCustomerTypes: {
    type: [String],
    enum: ['endUser', 'reseller', 'siChannel'],
    default: []
  }
}, {
  timestamps: true
});

// Index for faster email lookups (email field already has unique: true which creates an index)

// Virtual for password (not stored in DB)
salesUserSchema.virtual('password').set(function(password) {
  this.passwordHash = bcrypt.hashSync(password, 12);
});

// Method to check password
salesUserSchema.methods.checkPassword = function(password) {
  if (!this.passwordHash || !password) {
    return false;
  }
  return bcrypt.compareSync(password, this.passwordHash);
};

// Method to set new password
salesUserSchema.methods.setNewPassword = function(newPassword) {
  this.passwordHash = bcrypt.hashSync(newPassword, 12);
  this.mustChangePassword = false;
  this.passwordSetAt = new Date();
};

// Transform output to remove sensitive data
salesUserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export default mongoose.model('SalesUser', salesUserSchema);

