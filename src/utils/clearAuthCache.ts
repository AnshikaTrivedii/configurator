/**
 * Utility to completely clear authentication cache
 * Use this when experiencing issues with missing user data
 */
export const clearAuthCache = () => {
  console.log('🧹 Clearing all authentication cache...');
  
  // Clear localStorage
  localStorage.removeItem('salesToken');
  localStorage.removeItem('salesUser');
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear any in-memory caches
  if (typeof window !== 'undefined') {
    // Force reload to clear React state
    window.location.href = '/';
  }
  
  console.log('✅ Authentication cache cleared. Page will reload.');
};

/**
 * Verify if user object has required fields
 */
export const verifyUserObject = (user: any): { valid: boolean; missing: string[] } => {
  const required = ['_id', 'email', 'name', 'role'];
  const missing: string[] = [];
  
  required.forEach(field => {
    if (!user || !user[field]) {
      missing.push(field);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing
  };
};

