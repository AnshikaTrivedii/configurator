import { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import { SalesLoginModal } from './components/SalesLoginModal';
import { LandingPage } from './components/LandingPage';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { SalesUser, salesAPI } from './api/sales';
import { Product } from './types';
import { useDisplayConfig } from './contexts/DisplayConfigContext';
import { verifyUserObject } from './utils/clearAuthCache';

type UserRole = 'normal' | 'sales' | 'super' | 'super_admin' | 'partner';

function App() {
  const { updateDimensions, updateConfig } = useDisplayConfig();
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
          
          // CRITICAL: Verify stored user has all required fields
          if (storedUser) {
            const verification = verifyUserObject(storedUser);
            if (!verification.valid) {
              console.error('❌ Stored user missing required fields:', verification.missing);
              console.warn('⚠️ Clearing cache and forcing fresh login');
              salesAPI.logout();
              setSalesUser(null);
              setUserRole('normal');
              return; // Exit early, user needs to log in again
            }
          }
          
          if (storedUser) {
            setSalesUser(storedUser);
            // Map roles: 'super'/'super_admin' → 'super_admin', 'sales'/'partner' → keep as is
            const role = storedUser.role === 'super' || storedUser.role === 'super_admin' 
              ? 'super_admin' 
              : storedUser.role === 'sales' 
              ? 'sales'
              : storedUser.role === 'partner'
              ? 'partner'
              : 'normal';
            setUserRole(role);
            // If sales/partner/super_admin user, redirect to their respective views immediately
            if (role === 'sales' || role === 'partner' || role === 'super_admin') {
              setShowLandingPage(false);
              updateConfig({
                entryMode: 'direct',
                directProductMode: true
              });
              // Super admin users see dashboard, sales users see configurator
              if (role === 'super_admin') {
                setShowDashboard(true);
              } else {
                setShowDashboard(false);
              }
            }
          }

          // Then verify token is still valid in the background and refresh user data
          const response = await salesAPI.getProfile();
          
          // CRITICAL: Verify response includes all required fields
          const verification = verifyUserObject(response.user);
          if (!verification.valid) {
            console.error('❌ Profile response missing required fields:', verification.missing);
            console.error('❌ Profile response user:', response.user);
            salesAPI.logout();
            setSalesUser(null);
            setUserRole('normal');
            return;
          }
          
          console.log('✅ Profile response valid, setting user:', {
            _id: response.user._id,
            email: response.user.email,
            role: response.user.role
          });
          
          setSalesUser(response.user);
          // Map roles: 'super'/'super_admin' → 'super_admin', 'sales'/'partner' → keep as is
          const role = response.user.role === 'super' || response.user.role === 'super_admin' 
            ? 'super_admin' 
            : response.user.role === 'sales' 
            ? 'sales'
            : response.user.role === 'partner'
            ? 'partner'
            : 'normal';
          setUserRole(role);
          // If sales/partner/super_admin user, redirect to their respective views immediately
          if (role === 'sales' || role === 'partner' || role === 'super_admin') {
            setShowLandingPage(false);
            updateConfig({
              entryMode: 'direct',
              directProductMode: true
            });
            // Super admin users see dashboard, sales users see configurator
            if (role === 'super_admin') {
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
  }, [updateConfig]);

  const handleSalesLogin = (user: SalesUser) => {
    console.log('🎯 App.tsx - handleSalesLogin - user:', user);
    console.log('🎯 App.tsx - user.role:', user.role);
    console.log('🎯 App.tsx - user._id:', user._id);
    console.log('🎯 App.tsx - user object (full):', JSON.stringify(user, null, 2));
    
    // CRITICAL: Verify user object has all required fields
    const verification = verifyUserObject(user);
    if (!verification.valid) {
      console.error('❌ CRITICAL: User object missing required fields!', {
        missing: verification.missing,
        user: user,
        userKeys: Object.keys(user),
        userStringified: JSON.stringify(user, null, 2),
        note: 'Backend should include all fields in login response. Please check backend/routes/sales.js'
      });
      alert(`⚠️ Warning: User data is incomplete (missing: ${verification.missing.join(', ')}). Please contact support or try logging in again.`);
      return; // Don't proceed with incomplete user data
    }
    
    console.log('✅ User object verified, all required fields present:', {
      _id: user._id,
      email: user.email,
      role: user.role
    });
    
    // CRITICAL FIX: If user doesn't have a role, default to 'sales'
    // This handles cases where backend hasn't been updated or database doesn't have roles
    if (!user.role) {
      console.warn('⚠️ WARNING: User object missing role! Defaulting to "sales"');
      // Update the stored user as well with proper type
      const updatedUser: SalesUser = { ...user, role: 'sales' as const };
      setSalesUser(updatedUser);
      // Update localStorage
      const token = localStorage.getItem('salesToken');
      if (token) {
        salesAPI.setAuthData(token, updatedUser);
      }
    } else {
      // Ensure role is properly typed
      const typedUser: SalesUser = { ...user, role: user.role as 'sales' | 'super' | 'super_admin' | 'partner' };
      setSalesUser(typedUser);
    }
    
    // Map roles: 'super'/'super_admin' → 'super_admin', 'sales'/'partner' → keep as is
    const newRole = user.role === 'super' || user.role === 'super_admin' 
      ? 'super_admin' 
      : user.role === 'sales' 
      ? 'sales'
      : user.role === 'partner'
      ? 'partner'
      : 'normal';
    console.log('🎯 App.tsx - setting userRole to:', newRole);
    console.log('🎯 App.tsx - user.role after fix:', user.role);
    setUserRole(newRole);
    setShowSalesLogin(false);
    // If sales/partner/super_admin user, skip landing page and go to their respective views
    if (newRole === 'sales' || newRole === 'partner' || newRole === 'super_admin') {
      console.log('🎯 App.tsx - Redirecting for role:', newRole);
      setShowLandingPage(false);
      updateConfig({
        entryMode: 'direct',
        directProductMode: true
      });
      // Super admin users see dashboard, sales users see configurator
      if (newRole === 'super_admin') {
        setShowDashboard(true);
      } else {
        setShowDashboard(false);
      }
    } else {
      console.warn('⚠️ App.tsx - Unknown role, staying on landing page:', newRole);
      console.warn('⚠️ App.tsx - User object:', JSON.stringify(user, null, 2));
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
    updateConfig({
      entryMode: 'guided',
      directProductMode: false
    });
    setShowWizard(true);
  };

  const handleChooseProductDirectly = () => {
    // Skip wizard and go directly to dashboard/configurator
    setShowLandingPage(false);
    setShowWizard(false);
    setInitialConfig(null); // No initial config for direct product selection
    updateConfig({
      entryMode: 'direct',
      directProductMode: true,
      viewingDistance: null,
      pixelPitch: null
    });
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
    updateConfig({
      viewingDistance: config.viewingDistance || null,
      viewingDistanceUnit: config.viewingDistanceUnit,
      environment: config.environment,
      pixelPitch: config.pixelPitch,
      entryMode: 'guided',
      directProductMode: false,
      selectedProductName: config.selectedProduct?.name || null
    });
    setInitialConfig(config);
    setShowLandingPage(false);
    setShowWizard(false);
  };


  // Route to correct view based on user role
  // Sales/Partner users go directly to the LED Configurator (DisplayConfigurator)
  // Super admin users go to Admin Dashboard (SuperUserDashboard)
  if ((userRole === 'sales' || userRole === 'partner' || userRole === 'super_admin' || userRole === 'super') && !showLandingPage) {
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
            onDashboardOpen={() => {
              setShowDashboard(true);
            }}
          />
        </>
      );
    }
    
    // Sales/Partner users go to LED Configurator (DisplayConfigurator) - NOT a separate dashboard
    if (userRole === 'sales' || userRole === 'partner') {
      console.log('🎯 App.tsx - Rendering DisplayConfigurator for', userRole === 'partner' ? 'partner' : 'sales', 'user');
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
          onPartnerLogin={handleShowSalesLogin}
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
        onDashboardOpen={() => setShowDashboard(true)}
      />
    </>
  );
}

export default App;