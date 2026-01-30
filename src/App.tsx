import { useState, useEffect } from 'react';
import { DisplayConfigurator } from './components/DisplayConfigurator';
import { SalesLoginModal } from './components/SalesLoginModal';
import { LandingPage } from './components/LandingPage';
import { ConfigurationWizard } from './components/ConfigurationWizard';
import { SalesDashboard } from './components/SalesDashboard';
import { SalesUser, salesAPI } from './api/sales';
import { Product, Quotation } from './types';
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
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  const [activeQuotation, setActiveQuotation] = useState<Quotation | null>(null);
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

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (salesAPI.isLoggedIn()) {
        try {

          const storedUser = salesAPI.getStoredUser();

          if (storedUser) {
            const verification = verifyUserObject(storedUser);
            if (!verification.valid) {

              salesAPI.logout();
              setSalesUser(null);
              setUserRole('normal');
              return; // Exit early, user needs to log in again
            }
          }

          if (storedUser) {
            setSalesUser(storedUser);

            const role = storedUser.role === 'super' || storedUser.role === 'super_admin'
              ? 'super_admin'
              : storedUser.role === 'sales'
                ? 'sales'
                : storedUser.role === 'partner'
                  ? 'partner'
                  : 'normal';
            setUserRole(role);

            if (role === 'sales' || role === 'partner' || role === 'super_admin') {
              setShowLandingPage(false);
              updateConfig({
                entryMode: 'direct',
                directProductMode: true
              });

              if (role === 'super_admin') {
                setShowDashboard(true);
              } else {
                setShowDashboard(false);
              }
            }
          }

          const response = await salesAPI.getProfile();

          const verification = verifyUserObject(response.user);
          if (!verification.valid) {

            salesAPI.logout();
            setSalesUser(null);
            setUserRole('normal');
            return;
          }

          setSalesUser(response.user);

          const role = response.user.role === 'super' || response.user.role === 'super_admin'
            ? 'super_admin'
            : response.user.role === 'sales'
              ? 'sales'
              : response.user.role === 'partner'
                ? 'partner'
                : 'normal';
          setUserRole(role);

          if (role === 'sales' || role === 'partner' || role === 'super_admin') {
            setShowLandingPage(false);
            updateConfig({
              entryMode: 'direct',
              directProductMode: true
            });

            if (role === 'super_admin') {
              setShowDashboard(true);
            } else {
              setShowDashboard(false);
            }
          }
        } catch (error) {

          salesAPI.logout();
          setSalesUser(null);
          setUserRole('normal');
        }
      }
    };

    checkAuthStatus();
  }, [updateConfig]);

  const handleSalesLogin = (user: SalesUser) => {

    const verification = verifyUserObject(user);
    if (!verification.valid) {

      alert(`⚠️ Warning: User data is incomplete (missing: ${verification.missing.join(', ')}). Please contact support or try logging in again.`);
      return; // Don't proceed with incomplete user data
    }

    if (!user.role) {

      const updatedUser: SalesUser = { ...user, role: 'sales' as const };
      setSalesUser(updatedUser);

      const token = localStorage.getItem('salesToken');
      if (token) {
        salesAPI.setAuthData(token, updatedUser);
      }
    } else {

      const typedUser: SalesUser = { ...user, role: user.role as 'sales' | 'super' | 'super_admin' | 'partner' };
      setSalesUser(typedUser);
    }

    const newRole = user.role === 'super' || user.role === 'super_admin'
      ? 'super_admin'
      : user.role === 'sales'
        ? 'sales'
        : user.role === 'partner'
          ? 'partner'
          : 'normal';

    setUserRole(newRole);
    setShowSalesLogin(false);

    if (newRole === 'sales' || newRole === 'partner' || newRole === 'super_admin') {

      setShowLandingPage(false);
      updateConfig({
        entryMode: 'direct',
        directProductMode: true
      });

      if (newRole === 'super_admin') {
        setShowDashboard(true);
      } else {
        setShowDashboard(false);
      }
    } else {

      setShowLandingPage(true);
      setShowDashboard(false);
    }

  };

  const handleSalesLogout = () => {
    setSalesUser(null);
    setUserRole('normal');
    setShowSalesDashboard(false);
    setShowDashboard(false);
    setShowLandingPage(true);
    setInitialConfig(null);
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

  const handleEditQuotation = (quotation: Quotation) => {

    setActiveQuotation(quotation);

    const product = quotation.exactProductSpecs?.product || quotation.productDetails?.product || quotation.productDetails;
    const cabinetGrid = quotation.exactProductSpecs?.cabinetGrid || quotation.productDetails?.cabinetGrid || quotation.quotationData?.cabinetGrid;

    let configWidth = 0;
    let configHeight = 0;

    if (quotation.exactProductSpecs?.displaySize) {
      configWidth = quotation.exactProductSpecs.displaySize.width * 1000; // stored in m, convert to mm
      configHeight = quotation.exactProductSpecs.displaySize.height * 1000;
    } else if (quotation.quotationData?.config) {

      configWidth = quotation.quotationData.config.width;
      configHeight = quotation.quotationData.config.height;
      if (quotation.quotationData.config.unit === 'm') {
        configWidth *= 1000;
        configHeight *= 1000;
      }
    } else if (product && cabinetGrid && product.cabinetDimensions) {
      configWidth = cabinetGrid.columns * product.cabinetDimensions.width;
      configHeight = cabinetGrid.rows * product.cabinetDimensions.height;
    }

    if (configWidth && configHeight && product) {
      setInitialConfig({
        width: configWidth,
        height: configHeight,
        unit: 'mm',
        viewingDistance: '', // Not strictly needed for edit
        viewingDistanceUnit: 'meters',
        environment: product.environment as 'Indoor' | 'Outdoor',
        pixelPitch: product.pixelPitch,
        selectedProduct: product
      });

      setShowSalesDashboard(false);
      setShowDashboard(false);
      setShowLandingPage(false);
    } else {

      alert("Could not load configuration for editing. Data may be incomplete.");
    }
  };

  if ((userRole === 'sales' || userRole === 'partner' || userRole === 'super_admin' || userRole === 'super') && !showLandingPage) {

    if (userRole === 'super_admin' || userRole === 'super') {

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

    if (userRole === 'sales' || userRole === 'partner') {

      if (showSalesDashboard && userRole === 'sales') {
        return (
          <>
            <SalesLoginModal
              isOpen={showSalesLogin}
              onClose={() => setShowSalesLogin(false)}
              onLogin={handleSalesLogin}
            />
            <SalesDashboard
              onBack={() => setShowSalesDashboard(false)}
              onLogout={handleSalesLogout}
              onEditQuotation={handleEditQuotation}
              loggedInUser={salesUser ? {
                role: salesUser.role,
                name: salesUser.name,
                email: salesUser.email
              } : undefined}
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
            activeQuotation={activeQuotation}
            showDashboard={false}
            onDashboardClose={() => { }}
            showSalesDashboard={showSalesDashboard}
            onSalesDashboardOpen={() => setShowSalesDashboard(true)}
            onSalesDashboardClose={() => setShowSalesDashboard(false)}
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
        activeQuotation={activeQuotation}
        showDashboard={showDashboard}
        onDashboardClose={() => setShowDashboard(false)}
        onDashboardOpen={() => setShowDashboard(true)}
      />
    </>
  );
}

export default App;