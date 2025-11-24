import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, CheckCircle, ChevronDown, FileText, MapPin } from 'lucide-react';

interface UserInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  projectTitle: string;
  address: string;
  userType: 'End User' | 'Reseller' | 'Channel';
  paymentTerms?: string;
  warranty?: string;
}

interface UserInfoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userInfo: UserInfo) => void;
  title: string;
  submitButtonText: string;
  initialData?: UserInfo; // Add support for pre-filled data
  isEditMode?: boolean; // Add edit mode flag
  salesUser?: { email: string; name: string; contactNumber: string; location: string } | null;
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };
  onCustomPricingChange?: (pricing: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }) => void;
}

export const UserInfoForm: React.FC<UserInfoFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitButtonText,
  initialData,
  isEditMode = false,
  salesUser,
  customPricing: externalCustomPricing,
  onCustomPricingChange
}) => {
  const [formData, setFormData] = useState<UserInfo>(
    initialData || {
      fullName: '',
      email: '',
      phoneNumber: '',
      projectTitle: '',
      address: '',
      userType: 'End User',
      paymentTerms: '50% Advance at the time of placing order, 40% Before Shipment, 10% At the time of installation',
      warranty: 'LED Display: 24 months from the date of installation or 25 months from the date of supply whichever is earlier. Controller: 12 months from the date of installation or 13 months from the date of supply whichever is earlier.'
    }
  );
  const [errors, setErrors] = useState<Partial<UserInfo>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserTypeDropdownOpen, setIsUserTypeDropdownOpen] = useState(false);
  
  // Custom pricing state
  const [internalCustomPricingEnabled, setInternalCustomPricingEnabled] = useState(externalCustomPricing?.enabled || false);
  const [internalCustomStructurePrice, setInternalCustomStructurePrice] = useState<number | null>(externalCustomPricing?.structurePrice || null);
  const [internalCustomInstallationPrice, setInternalCustomInstallationPrice] = useState<number | null>(externalCustomPricing?.installationPrice || null);
  
  // Use external pricing if provided, otherwise use internal state
  const customPricingEnabled = externalCustomPricing?.enabled ?? internalCustomPricingEnabled;
  const customStructurePrice = externalCustomPricing?.structurePrice ?? internalCustomStructurePrice;
  const customInstallationPrice = externalCustomPricing?.installationPrice ?? internalCustomInstallationPrice;
  
  // Update external state when internal state changes
  const updateCustomPricing = (enabled: boolean, structurePrice: number | null, installationPrice: number | null) => {
    if (onCustomPricingChange) {
      onCustomPricingChange({
        enabled,
        structurePrice,
        installationPrice
      });
    } else {
      setInternalCustomPricingEnabled(enabled);
      setInternalCustomStructurePrice(structurePrice);
      setInternalCustomInstallationPrice(installationPrice);
    }
  };

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const userTypeOptions: Array<{ value: 'End User' | 'Reseller' | 'Channel'; label: string }> = [
    { value: 'End User', label: 'End User' },
    { value: 'Reseller', label: 'Reseller' },
    { value: 'Channel', label: 'Channel' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<UserInfo> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (!formData.projectTitle.trim()) {
      newErrors.projectTitle = 'Project title is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.userType) {
      newErrors.userType = 'User type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Only reset form if not in edit mode
      if (!isEditMode) {
        setFormData({ 
          fullName: '', 
          email: '', 
          phoneNumber: '', 
          projectTitle: '', 
          address: '', 
          userType: 'End User',
          paymentTerms: '50% Advance at the time of placing order, 40% Before Shipment, 10% At the time of installation',
          warranty: 'LED Display: 24 months from the date of installation or 25 months from the date of supply whichever is earlier. Controller: 12 months from the date of installation or 13 months from the date of supply whichever is earlier.'
        });
      }
      setErrors({});
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleUserTypeSelect = (userType: 'End User' | 'Reseller' | 'Channel') => {
    setFormData(prev => ({ ...prev, userType }));
    setIsUserTypeDropdownOpen(false);
    if (errors.userType) {
      setErrors(prev => ({ ...prev, userType: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm text-blue-100">
                  {isEditMode ? 'Update client details and regenerate quotation' : 'Please provide your details to continue'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter client name"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="Enter your phone number"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
          </div>

          {/* Project Title Field */}
          <div>
            <label htmlFor="projectTitle" className="block text-sm font-semibold text-gray-700 mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="projectTitle"
                value={formData.projectTitle}
                onChange={(e) => handleInputChange('projectTitle', e.target.value)}
                placeholder="Enter project title"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.projectTitle ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.projectTitle && (
              <p className="mt-1 text-sm text-red-600">{errors.projectTitle}</p>
            )}
          </div>

          {/* Address Field */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
                rows={3}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                  errors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* User Type Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              User Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserTypeDropdownOpen(!isUserTypeDropdownOpen)}
                className={`w-full pl-3 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-left ${
                  errors.userType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <span className={formData.userType ? 'text-gray-900' : 'text-gray-500'}>
                  {formData.userType || 'Select user type'}
                </span>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </button>
              
              {isUserTypeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  {userTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleUserTypeSelect(option.value)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.userType && (
              <p className="mt-1 text-sm text-red-600">{errors.userType}</p>
            )}
          </div>

          {/* Custom Pricing Toggle - Only for sales users */}
          {salesUser && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <label htmlFor="customPricing" className="flex items-center text-sm font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="customPricing"
                    checked={customPricingEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      updateCustomPricing(
                        enabled,
                        enabled ? customStructurePrice : null,
                        enabled ? customInstallationPrice : null
                      );
                    }}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                  />
                  <span>Do you want to enter custom structure & installation pricing?</span>
                </label>
              </div>

              {customPricingEnabled && (
                <div className="space-y-4 pl-7">
                  <div>
                    <label htmlFor="customStructurePrice" className="block text-sm font-semibold text-gray-700 mb-2">
                      Custom Structure Price (₹)
                    </label>
                    <input
                      type="number"
                      id="customStructurePrice"
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        customPricingEnabled ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Enter custom structure price"
                      value={customStructurePrice ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        const newValue = value && !isNaN(value) ? value : null;
                        updateCustomPricing(customPricingEnabled, newValue, customInstallationPrice);
                      }}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="customInstallationPrice" className="block text-sm font-semibold text-gray-700 mb-2">
                      Custom Installation Price (₹)
                    </label>
                    <input
                      type="number"
                      id="customInstallationPrice"
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        customPricingEnabled ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Enter custom installation price"
                      value={customInstallationPrice ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        const newValue = value && !isNaN(value) ? value : null;
                        updateCustomPricing(customPricingEnabled, customStructurePrice, newValue);
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Terms and Conditions Fields - Only for sales users */}
          {salesUser && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Terms & Conditions</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="paymentTerms" className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <textarea
                    id="paymentTerms"
                    value={formData.paymentTerms || ''}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    placeholder="Enter payment terms"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="warranty" className="block text-sm font-semibold text-gray-700 mb-2">
                    Warranty
                  </label>
                  <textarea
                    id="warranty"
                    value={formData.warranty || ''}
                    onChange={(e) => handleInputChange('warranty', e.target.value)}
                    placeholder="Enter warranty details"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                submitButtonText
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
