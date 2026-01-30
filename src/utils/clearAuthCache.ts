/**
 * Utility to completely clear authentication cache
 * Use this when experiencing issues with missing user data
 */
export const clearAuthCache = () => {

  localStorage.removeItem('salesToken');
  localStorage.removeItem('salesUser');

  sessionStorage.clear();

  if (typeof window !== 'undefined') {

    window.location.href = '/';
  }

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

