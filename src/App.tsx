import React, { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import { SalesLoginModal } from './components/SalesLoginModal';
import { LandingPage } from './components/LandingPage';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { SalesDashboard } from './components/SalesDashboard';
import { SalesUser, salesAPI } from './api/sales';
import { Product } from './types';
import { useDisplayConfig } from './contexts/DisplayConfigContext';

type UserRole = 'normal' | 'sales' | 'super' | 'super_admin';

function App() {
  const { updateDimensions } = useDisplayConfig();
  const [userRole, setUserRole] = useState<UserRole>('normal');
  const [salesUser, setSalesUser] = useState<SalesUser | null>(null);
  const [showSalesLogin, setShowSalesLogin] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [initialConfig, setInitialConfig] = useState<{
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'm' | 'ft';
    viewingDistance: string;
    viewingDistanceUnit: 'meters' | 'feet';
    environment: 'Indoor' | 'Outdoor';
    pixelPitch: number | null;
    selectedProduct: Product | null;
  } | null>(null);

  // Check localStorage on mount and validate token
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (salesAPI.isLoggedIn()) {
        try {
          // First try to get user from localStorage for instant loading
          const storedUser = salesAPI.getStoredUser();
          if (storedUser) {
            setSalesUser(storedUser);
            // Map 'super' to 'super_admin' for backward compatibility, or use the role directly
            const role = storedUser.role === 'super' || storedUser.role === 'super_admin' 
              ? 'super_admin' 
              : storedUser.role === 'sales' 
              ? 'sales' 
              : 'normal';
            setUserRole(role);
            // If sales/super_admin user, redirect to their respective views immediately
            if (role === 'sales' || role === 'super_admin') {
              setShowLandingPage(false);
              // Super admin users see dashboard, sales users see configurator
              if (role === 'super_admin' || role === 'super') {
                setShowDashboard(true);
              } else {
                setShowDashboard(false);
              }
            }
          }

          // Then verify token is still valid in the background
          const response = await salesAPI.getProfile();
          setSalesUser(response.user);
          // Map 'super' to 'super_admin' for backward compatibility
          const role = response.user.role === 'super' || response.user.role === 'super_admin' 
            ? 'super_admin' 
            : response.user.role === 'sales' 
            ? 'sales' 
            : 'normal';
          setUserRole(role);
          // If sales/super_admin user, redirect to their respective views immediately
          if (role === 'sales' || role === 'super_admin') {
            setShowLandingPage(false);
            // Super admin users see dashboard, sales users see configurator
            if (role === 'super_admin' || role === 'super') {
              setShowDashboard(true);
            } else {
              setShowDashboard(false);
            }
          }
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
    console.log('🎯 App.tsx - handleSalesLogin - user:', user);
    console.log('🎯 App.tsx - user.role:', user.role);
    setSalesUser(user);
    // Map 'super' to 'super_admin' for backward compatibility
    const newRole = user.role === 'super' || user.role === 'super_admin' 
      ? 'super_admin' 
      : user.role === 'sales' 
      ? 'sales' 
      : 'normal';
    console.log('🎯 App.tsx - setting userRole to:', newRole);
    console.log('🎯 App.tsx - user object:', JSON.stringify(user, null, 2));
    setUserRole(newRole);
    setShowSalesLogin(false);
    // If sales/super_admin user, skip landing page and go to their respective views
    if (newRole === 'sales' || newRole === 'super_admin') {
      console.log('🎯 App.tsx - Redirecting for role:', newRole);
      setShowLandingPage(false);
      // Super admin users see dashboard, sales users see configurator
      if (newRole === 'super_admin' || newRole === 'super') {
        setShowDashboard(true);
      } else {
        setShowDashboard(false);
      }
    } else {
      console.warn('⚠️ App.tsx - Unknown role, staying on landing page:', newRole);
      setShowLandingPage(true);
      setShowDashboard(false);
    }
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

  const handleStartConfiguration = () => {
    setShowWizard(true);
  };

  const handleChooseProductDirectly = () => {
    // Skip wizard and go directly to dashboard/configurator
    setShowLandingPage(false);
    setShowWizard(false);
    setInitialConfig(null); // No initial config for direct product selection
  };

  const handleWizardComplete = (config: {
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'm' | 'ft';
    viewingDistance: string;
    viewingDistanceUnit: 'meters' | 'feet';
    environment: 'Indoor' | 'Outdoor';
    pixelPitch: number | null;
    selectedProduct: Product | null;
  }) => {
    // Update global state with dimensions from wizard
    updateDimensions(config.width, config.height, config.unit);
    setInitialConfig(config);
    setShowLandingPage(false);
    setShowWizard(false);
  };

  // Route to correct view based on user role
  // Sales users go directly to the LED Configurator (DisplayConfigurator)
  // Super admin users go to Admin Dashboard (SuperUserDashboard)
  if ((userRole === 'sales' || userRole === 'super_admin' || userRole === 'super') && !showLandingPage) {
    console.log('🎯 App.tsx - User logged in, userRole:', userRole);
    
    // Super admin users go to Admin Dashboard (SuperUserDashboard)
    if (userRole === 'super_admin' || userRole === 'super') {
      console.log('🎯 App.tsx - Rendering AdminDashboard (SuperUserDashboard)');
      return (
        <>
          <SalesLoginModal 
            isOpen={showSalesLogin} 
            onClose={() => setShowSalesLogin(false)}
            onLogin={handleSalesLogin}
          />
          <DisplayConfigurator 
            userRole="super"
            salesUser={salesUser}
            onShowSalesLogin={handleShowSalesLogin}
            onSalesLogout={handleSalesLogout}
            initialConfig={null}
            showDashboard={showDashboard}
            onDashboardClose={() => {
              setShowDashboard(false);
            }}
          />
        </>
      );
    }
    
    // Sales users go to LED Configurator (DisplayConfigurator) - NOT a separate dashboard
    if (userRole === 'sales') {
      console.log('🎯 App.tsx - Rendering DisplayConfigurator for sales user');
      return (
        <>
          <SalesLoginModal 
            isOpen={showSalesLogin} 
            onClose={() => setShowSalesLogin(false)}
            onLogin={handleSalesLogin}
          />
          <DisplayConfigurator 
            userRole="sales"
            salesUser={salesUser}
            onShowSalesLogin={handleShowSalesLogin}
            onSalesLogout={handleSalesLogout}
            initialConfig={null}
            showDashboard={false}
            onDashboardClose={() => {}}
          />
        </>
      );
    }
  }

  if (showLandingPage && !initialConfig) {
    return (
      <>
        <LandingPage 
          onStartConfiguration={handleStartConfiguration}
          onChooseProductDirectly={handleChooseProductDirectly}
          onSalesLogin={handleShowSalesLogin}
        />
        <SalesLoginModal 
          isOpen={showSalesLogin} 
          onClose={() => setShowSalesLogin(false)}
          onLogin={handleSalesLogin}
        />
        <ConfigurationWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      </>
    );
  }

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
        initialConfig={initialConfig}
        showDashboard={showDashboard}
        onDashboardClose={() => setShowDashboard(false)}
      />
    </>
  );
}

export default App;