// Configuration file for backend settings
export const config = {
  // Resend API key for email service
  resendApiKey: process.env.RESEND_API_KEY || null,
  
  // Email configuration - matching original server variable names
  toEmail: process.env.TO_EMAIL || null,
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@orion-connect.com',
  
  // Environment
  isDevelopment: process.env.NODE_ENV !== 'production',
  
  // Other config can be added here
};

