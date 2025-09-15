import React, { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import { SalesLoginModal } from './components/SalesLoginModal';
import { SalesUser, salesAPI } from './api/sales';

type UserRole = 'normal' | 'sales';

function App() {
  const [userRole, setUserRole] = useState<UserRole>('normal');
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const [showSalesLogin, setShowSalesLogin] = useState(false);

  // Check localStorage on mount and validate token
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (salesAPI.isLoggedIn()) {
        try {
          // First try to get user from localStorage for instant loading
          const storedUser = salesAPI.getStoredUser();
          if (storedUser) {
            setSalesUser(storedUser);
            setUserRole('sales');
          }

          // Then verify token is still valid in the background
          const response = await salesAPI.getProfile();
          setSalesUser(response.user);
          setUserRole('sales');
        } catch (error) {
          // Token is invalid, clear storage
          salesAPI.logout();
          setSalesUser(null);
          setUserRole('normal');
        }
      }
    };

    checkAuthStatus();
  }, []);

  const handleSalesLogin = (user: SalesUser) => {
    setSalesUser(user);
    setUserRole('sales');
    setShowSalesLogin(false);
    // Auth data is already stored by the API
  };

  const handleSalesLogout = () => {
    setSalesUser(null);
    setUserRole('normal');
    salesAPI.logout();
  };

  const handleShowSalesLogin = () => {
    setShowSalesLogin(true);
  };

  return (
    <>
      <SalesLoginModal 
        isOpen={showSalesLogin} 
        onClose={() => setShowSalesLogin(false)}
        onLogin={handleSalesLogin}
      />
      <DisplayConfigurator 
        userRole={userRole}
        salesUser={salesUser}
        onShowSalesLogin={handleShowSalesLogin}
        onSalesLogout={handleSalesLogout}
      />
    </>
  );
}

export default App;