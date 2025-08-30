import React, { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import { SalesLoginModal, SalesUser } from './components/SalesLoginModal';

type UserRole = 'normal' | 'sales';

function App() {
  const [userRole, setUserRole] = useState<UserRole>('normal');
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const [showSalesLogin, setShowSalesLogin] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const storedSalesUser = localStorage.getItem('salesUser');
    if (storedSalesUser) {
      try {
        const user = JSON.parse(storedSalesUser);
        setSalesUser(user);
        setUserRole('sales');
      } catch (error) {
        localStorage.removeItem('salesUser');
      }
    }
  }, []);

  const handleSalesLogin = (user: SalesUser) => {
    setSalesUser(user);
    setUserRole('sales');
    setShowSalesLogin(false);
    localStorage.setItem('salesUser', JSON.stringify(user));
  };

  const handleSalesLogout = () => {
    setSalesUser(null);
    setUserRole('normal');
    localStorage.removeItem('salesUser');
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