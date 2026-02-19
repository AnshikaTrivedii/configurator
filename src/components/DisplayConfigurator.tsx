import React, { useState, useEffect, useRef } from 'react';
import { Package, Menu, X, Mail, Download, FileText, User, LayoutDashboard, LogOut } from 'lucide-react';
import { useDisplayCalculations } from '../hooks/useDisplayCalculations';
import { DimensionControls } from './DimensionControls';
import { AspectRatioSelector } from './AspectRatioSelector';
import { DisplayPreview } from './DisplayPreview';
import { ProductSelector } from './ProductSelector';
import { ConfigurationSummary } from './ConfigurationSummary';
import { ProductSidebar } from './ProductSidebar';
import { Product, CabinetGrid, Quotation } from '../types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import DataWiringView from './DataWiringView';
import PowerWiringView from './PowerWiringView';
import { QuoteModal } from './QuoteModal';
import { UserInfoForm } from './UserInfoForm';
import { useControllerSelection } from '../hooks/useControllersSelection';
import { generateConfigurationDocx, generateConfigurationHtml, generateConfigurationPdf } from '../utils/docxGenerator';
import { PdfViewModal } from './PdfViewModal';
import { SalesUser } from '../api/sales';
import { clientAPI } from '../api/clients';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { SuperUserDashboard } from './SuperUserDashboard';
import { SalesDashboard } from './SalesDashboard';
import { useDisplayConfig } from '../contexts/DisplayConfigContext';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DisplayConfiguratorProps {
  userRole: 'normal' | 'sales' | 'super' | 'super_admin' | 'partner';
  salesUser: SalesUser | null;
  onShowSalesLogin: () => void;
  onSalesLogout: () => void;
  initialConfig?: {
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'm' | 'ft';
    viewingDistance: string;
    viewingDistanceUnit: 'meters' | 'feet';
    environment: 'Indoor' | 'Outdoor';
    pixelPitch: number | null;
    selectedProduct: Product | null;
  } | null;
  activeQuotation?: Quotation | null;
  showDashboard?: boolean;
  onDashboardClose?: () => void;
  onDashboardOpen?: () => void;
  showSalesDashboard?: boolean;
  onSalesDashboardOpen?: () => void;
  onSalesDashboardClose?: () => void;
}

export const DisplayConfigurator: React.FC<DisplayConfiguratorProps> = ({
  userRole,
  salesUser,
  onShowSalesLogin,
  onSalesLogout,
  initialConfig,
  activeQuotation,
  showDashboard: showDashboardProp,
  onDashboardClose,
  onDashboardOpen,
  showSalesDashboard: showSalesDashboardProp,
  onSalesDashboardOpen,
  onSalesDashboardClose
}) => {
  const { config: globalConfig, updateDimensions: updateGlobalDimensions, updateConfig } = useDisplayConfig();
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(
    initialConfig?.selectedProduct || undefined
  );
  const [showLeftPanel, setShowLeftPanel] = useState(!!initialConfig?.selectedProduct);
  const isInitialMount = useRef(true);

  const {
    config,
    aspectRatios,
    updateWidth,
    updateHeight,
    updateUnit,
    updateAspectRatio,
    displayDimensions,
    calculateCabinetGrid,
    setConfig
  } = useDisplayCalculations(selectedProduct);

  useEffect(() => {

    isInitialMount.current = true;

    if (initialConfig) {

      const displayUnit = initialConfig.unit === 'mm' || initialConfig.unit === 'cm'
        ? 'm'
        : initialConfig.unit; // Keep 'ft' or 'm' as entered

      setConfig(prevConfig => {
        const newConfig = {
          width: initialConfig.width,  // Already in mm, exact value from wizard
          height: initialConfig.height, // Already in mm, exact value from wizard
          unit: displayUnit, // Preserve 'ft' or 'm' as user entered
          aspectRatio: 'None' // Reset aspect ratio to allow free dimensions
        };

        return newConfig;
      });

      updateGlobalDimensions(initialConfig.width, initialConfig.height, initialConfig.unit);
    } else {

      const displayUnit = globalConfig.unit === 'mm' || globalConfig.unit === 'cm' ? 'm' : globalConfig.unit;

      setConfig(prevConfig => ({
        width: globalConfig.width,
        height: globalConfig.height,
        unit: displayUnit,
        aspectRatio: 'None'
      }));
    }

    setTimeout(() => {
      isInitialMount.current = false;

    }, 200);

  }, [initialConfig]);

  useEffect(() => {
    if (activeQuotation) {

      setQuotationId(activeQuotation.quotationId);
      setIsEditMode(true);

      const getUserType = (type: string): 'End User' | 'Reseller' | 'SI/Channel Partner' => {
        if (type === 'reseller' || type === 'Reseller') return 'Reseller';
        if (type === 'siChannel' || type === 'Channel' || type === 'SI/Channel Partner') return 'SI/Channel Partner';
        return 'End User';
      };

      // Fetch client info if clientId exists
      const fetchClientInfo = async () => {
        let clientProjectTitle = '';
        let clientLocation = '';

        // Handle clientId in various formats (string, ObjectId, MongoDB extended JSON)
        const rawClientId = activeQuotation.clientId;
        console.log('Raw clientId from quotation:', rawClientId, 'Type:', typeof rawClientId);
        let clientIdString: string | null = null;

        if (rawClientId) {
          if (typeof rawClientId === 'string') {
            clientIdString = rawClientId;
          } else if (rawClientId.$oid) {
            // MongoDB extended JSON format: {"$oid": "..."}
            clientIdString = rawClientId.$oid;
          } else if (rawClientId._id) {
            clientIdString = String(rawClientId._id);
          } else if (typeof rawClientId.toString === 'function') {
            clientIdString = rawClientId.toString();
          } else {
            clientIdString = String(rawClientId);
          }
        }

        if (clientIdString) {
          try {
            console.log('Fetching client info for clientId:', clientIdString, 'Original:', rawClientId);
            const clientResponse = await clientAPI.getClientById(clientIdString);
            if (clientResponse.success && clientResponse.client) {
              clientProjectTitle = clientResponse.client.projectTitle || '';
              clientLocation = clientResponse.client.location || '';
              console.log('Client info fetched:', { projectTitle: clientProjectTitle, location: clientLocation });
            } else {
              console.warn('Client fetch response not successful:', clientResponse);
            }
          } catch (error) {
            console.error('Failed to fetch client info:', error);
          }
        } else {
          console.log('No clientId found in quotation. Raw clientId value:', rawClientId);
        }

        let extractedUserInfo: any = null;
        const qUserInfo = activeQuotation.quotationData?.userInfo;

        if (activeQuotation.customerName) {
          extractedUserInfo = {
            fullName: activeQuotation.customerName,
            email: activeQuotation.customerEmail,
            phoneNumber: activeQuotation.customerPhone,
            // Use client info if available, otherwise fallback to quotationData
            projectTitle: clientProjectTitle || qUserInfo?.projectTitle || activeQuotation.quotationData?.projectTitle || '',
            address: clientLocation || qUserInfo?.address || activeQuotation.quotationData?.address || '',
            userType: getUserType(activeQuotation.userType),
            validity: qUserInfo?.validity,
            paymentTerms: qUserInfo?.paymentTerms,
            warranty: qUserInfo?.warranty
          };
        } else if (qUserInfo) {

          extractedUserInfo = {
            fullName: qUserInfo.fullName || qUserInfo.customerName || '',
            email: qUserInfo.email || qUserInfo.customerEmail || '',
            phoneNumber: qUserInfo.phoneNumber || qUserInfo.customerPhone || '',
            // Use client info if available, otherwise fallback to quotationData
            projectTitle: clientProjectTitle || qUserInfo.projectTitle || '',
            address: clientLocation || qUserInfo.address || '',
            userType: getUserType(qUserInfo.userType || activeQuotation.userType),
            validity: qUserInfo.validity,
            paymentTerms: qUserInfo.paymentTerms,
            warranty: qUserInfo.warranty
          };
        }

        if (extractedUserInfo && extractedUserInfo.fullName) {
          console.log('Setting userInfo with client data:', extractedUserInfo);
          setUserInfo(extractedUserInfo);
          setIsMandatoryFormSubmitted(true);
        } else {
          if (extractedUserInfo) {
            console.log('Setting userInfo (no fullName):', extractedUserInfo);
            setUserInfo(extractedUserInfo);
          }
        }
      };

      fetchClientInfo();

      if (activeQuotation.quotationData?.customPricing) {
        setCustomPricing(activeQuotation.quotationData.customPricing);
      }
    }
  }, [activeQuotation]);

  useEffect(() => {

    if (isInitialMount.current) {

      return;
    }

    if (initialConfig &&
      config.width === initialConfig.width &&
      config.height === initialConfig.height) {

      return;
    }

    const unitForStorage = config.unit === 'm' ? 'm' : config.unit;
    updateGlobalDimensions(config.width, config.height, unitForStorage);

  }, [config.width, config.height, config.unit]);

  useEffect(() => {
    if (selectedProduct) {
      setShowLeftPanel(true);
    }
  }, [selectedProduct]);

  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  useEffect(() => {
    if (!initialConfig && !selectedProduct) {

      const timer = setTimeout(() => {
        setIsProductSelectorOpen(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialConfig, selectedProduct]);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isPdfViewModalOpen, setIsPdfViewModalOpen] = useState(false);
  const [isUserInfoFormOpen, setIsUserInfoFormOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ fullName: string; email: string; phoneNumber: string; projectTitle: string; address: string; userType: 'End User' | 'Reseller' | 'SI/Channel Partner'; paymentTerms?: string; warranty?: string; validity?: string } | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<'quote' | 'pdf' | null>(null);
  const [isMandatoryFormSubmitted, setIsMandatoryFormSubmitted] = useState(false);
  const [quotationId, setQuotationId] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDashboardInternal, setShowDashboardInternal] = useState(false);

  const showDashboard = showDashboardProp !== undefined ? showDashboardProp : showDashboardInternal;
  const setShowDashboard = onDashboardClose || (() => setShowDashboardInternal(false));

  const [selectedController, setSelectedController] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');

  const [customPricing, setCustomPricing] = useState<{
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }>({
    enabled: false,
    structurePrice: null,
    installationPrice: null
  });
  const [redundancyEnabled, setRedundancyEnabled] = useState(false);

  const cabinetGrid = calculateCabinetGrid(selectedProduct);

  // Allowed processors only (names and capacities). Suggested = smallest that can handle required pixels.
  const ALLOWED_PROCESSORS = [
    { name: 'TB2', type: 'asynchronous' as const, portCount: 1, pixelCapacity: 0.65, inputs: 0, outputs: 0, maxResolution: '' },
    { name: 'TB40', type: 'asynchronous' as const, portCount: 2, pixelCapacity: 1.3, inputs: 1, outputs: 3, maxResolution: '1920×1080@60Hz' },
    { name: 'TB60', type: 'asynchronous' as const, portCount: 4, pixelCapacity: 2.3, inputs: 1, outputs: 5, maxResolution: '1920×1080@60Hz' },
    { name: 'VX1', type: 'synchronous' as const, portCount: 2, pixelCapacity: 1.3, inputs: 5, outputs: 2, maxResolution: '1920×1080@60Hz' },
    { name: 'VX400', type: 'synchronous' as const, portCount: 4, pixelCapacity: 2.6, inputs: 5, outputs: 4, maxResolution: '1920×1200@60Hz' },
    { name: 'VX400 Pro', type: 'synchronous' as const, portCount: 4, pixelCapacity: 2.6, inputs: 5, outputs: 4, maxResolution: '4096×2160@60Hz (4K)' },
    { name: 'VX600', type: 'synchronous' as const, portCount: 6, pixelCapacity: 3.9, inputs: 5, outputs: 6, maxResolution: '1920×1200@60Hz' },
    { name: 'VX600 Pro', type: 'synchronous' as const, portCount: 6, pixelCapacity: 3.9, inputs: 5, outputs: 6, maxResolution: '4096×2160@60Hz (4K)' },
    { name: 'VX1000', type: 'synchronous' as const, portCount: 10, pixelCapacity: 6.5, inputs: 6, outputs: 10, maxResolution: '3840×2160@30Hz' },
    { name: 'VX1000 Pro', type: 'synchronous' as const, portCount: 10, pixelCapacity: 6.5, inputs: 5, outputs: 10, maxResolution: '4096×2160@60Hz (True 4K@60)' },
    { name: 'VX16S', type: 'synchronous' as const, portCount: 16, pixelCapacity: 10, inputs: 7, outputs: 16, maxResolution: '3840×2160@60Hz' },
    { name: 'VX2000pro', type: 'synchronous' as const, portCount: 25, pixelCapacity: 13, inputs: 10, outputs: 25, maxResolution: '4096×2160@60Hz (4K)' },
    { name: 'TU15PRO', type: 'synchronous' as const, portCount: 5, pixelCapacity: 2.6, inputs: 2, outputs: 5, maxResolution: '2048×1152@60Hz' },
    { name: 'TU20PRO', type: 'synchronous' as const, portCount: 7, pixelCapacity: 3.9, inputs: 2, outputs: 7, maxResolution: '2048×1152@60Hz' },
    { name: 'TU4k pro', type: 'synchronous' as const, portCount: 23, pixelCapacity: 13, inputs: 3, outputs: 23, maxResolution: '4096×2160@60Hz' },
  ];

  const createControllerSelection = () => {
    if (!selectedProduct) return null;

    const totalPixels = selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows;
    const totalPixelsMillion = totalPixels / 1_000_000;

    // Only processors whose pixel capacity (in pixels) is >= required total pixels
    const availableProcessors = ALLOWED_PROCESSORS
      .filter((p) => p.pixelCapacity * 1_000_000 >= totalPixels)
      .sort((a, b) => a.pixelCapacity - b.pixelCapacity);
    const suggestedName = availableProcessors[0]?.name ?? 'TU4k pro';
    const effectiveName = availableProcessors.some((p) => p.name === selectedController) ? selectedController : suggestedName;
    const resolved = ALLOWED_PROCESSORS.find((p) => p.name === effectiveName) ?? ALLOWED_PROCESSORS[ALLOWED_PROCESSORS.length - 1];

    return {
      selectedController: {
        name: resolved.name,
        type: resolved.type,
        portCount: resolved.portCount,
        pixelCapacity: resolved.pixelCapacity,
        inputs: resolved.inputs,
        outputs: resolved.outputs,
        maxResolution: resolved.maxResolution
      },
      requiredPorts: Math.ceil(totalPixels / 655000),
      dataHubPorts: Math.ceil(totalPixels / 655000),
      backupPorts: redundancyEnabled ? Math.ceil(totalPixels / 655000) : 0,
      isRedundancyMode: redundancyEnabled,
      totalPixels: totalPixels
    };
  };

  const controllerSelection = createControllerSelection() || undefined;

  // For dropdown: processors with capacity >= totalPixels, suggested first, then higher capacity only
  const totalPixelsForProcessor = selectedProduct
    ? selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows
    : 0;
  const processorDropdownOptions = selectedProduct
    ? ALLOWED_PROCESSORS
      .filter((p) => p.pixelCapacity * 1_000_000 >= totalPixelsForProcessor)
      .sort((a, b) => a.pixelCapacity - b.pixelCapacity)
      .map((p) => p.name)
    : [];

  const getAutoSelectedController = (product: Product, grid: CabinetGrid) => {
    const totalPixels = product.resolution.width * grid.columns * product.resolution.height * grid.rows;
    const available = ALLOWED_PROCESSORS
      .filter((p) => p.pixelCapacity * 1_000_000 >= totalPixels)
      .sort((a, b) => a.pixelCapacity - b.pixelCapacity);
    return available[0]?.name ?? 'TU4k pro';
  };

  useEffect(() => {
    if (selectedProduct) {
      const grid = calculateCabinetGrid(selectedProduct);
      setSelectedController(getAutoSelectedController(selectedProduct, grid));
    }
  }, [selectedProduct, config.width, config.height]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);

    if (product.category?.toLowerCase().includes('digital standee')) {
      updateWidth(product.cabinetDimensions.width);
      updateHeight(product.cabinetDimensions.height);
    } else {
      const { totalWidth, totalHeight } = calculateCabinetGrid(product);
      updateWidth(totalWidth);
      updateHeight(totalHeight);
    }
    setActiveTab('preview');
    const normalizedEnv = product.environment?.toLowerCase();
    updateConfig({
      selectedProductName: product.name,
      pixelPitch: product.pixelPitch,
      environment: normalizedEnv === 'indoor'
        ? 'Indoor'
        : normalizedEnv === 'outdoor'
          ? 'Outdoor'
          : globalConfig.environment
    });

    setIsProductSelectorOpen(false);
  };

  const handleUserInfoSubmit = async (userData: { fullName: string; email: string; phoneNumber: string; projectTitle: string; address: string; userType: 'End User' | 'Reseller' | 'SI/Channel Partner'; paymentTerms?: string; warranty?: string }) => {
    setUserInfo(userData);
    setIsUserInfoFormOpen(false);

    // Update existing client or create/find client when user info is submitted (for sales/partner users)
    if (userRole === 'sales' || userRole === 'partner') {
      try {
        const clientData = {
          name: userData.fullName.trim(),
          email: userData.email.trim(),
          phone: userData.phoneNumber.trim(),
          projectTitle: userData.projectTitle?.trim() || '',
          location: userData.address?.trim() || '',
          company: '',
          notes: ''
        };

        // If editing and clientId exists, update the existing client
        if (isEditMode && activeQuotation?.clientId) {
          // Convert clientId to string if it's an object (handle MongoDB extended JSON format)
          const rawClientId = activeQuotation.clientId;
          let clientIdString: string;
          if (typeof rawClientId === 'string') {
            clientIdString = rawClientId;
          } else if (rawClientId.$oid) {
            // MongoDB extended JSON format: {"$oid": "..."}
            clientIdString = rawClientId.$oid;
          } else if (rawClientId._id) {
            clientIdString = String(rawClientId._id);
          } else if (typeof rawClientId.toString === 'function') {
            clientIdString = rawClientId.toString();
          } else {
            clientIdString = String(rawClientId);
          }
          const updateResponse = await clientAPI.updateClient(clientIdString, clientData);
          if (updateResponse.success && updateResponse.client) {
            console.log('✅ Client updated from UserInfoForm:', updateResponse.client._id);
          }
        } else {
          // Otherwise, create or find client
          const clientResponse = await clientAPI.findOrCreateClient(clientData);
          if (clientResponse.success && clientResponse.client) {
            console.log('✅ Client created/found from UserInfoForm:', clientResponse.client._id);
          }
        }
      } catch (clientError: any) {
        console.error('⚠️ Failed to update/create client from UserInfoForm:', clientError);
        // Continue even if client update/creation fails
      }
    }

    if (!isEditMode) {
      const username = (userRole === 'sales' || userRole === 'partner') && salesUser ? salesUser.name : userData.fullName;
      try {
        const newQuotationId = await QuotationIdGenerator.generateQuotationId(username);
        setQuotationId(newQuotationId);

        QuotationIdGenerator.storeQuotationId(newQuotationId, username);
      } catch (error) {

        const fallbackId = `ORION/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${username.toUpperCase()}/001`;
        setQuotationId(fallbackId);
      }
    }

    if (userRole === 'sales' || userRole === 'partner') {
      setIsMandatoryFormSubmitted(true);
    }

    if (pendingAction === 'quote') {
      setIsQuoteModalOpen(true);
    } else if (pendingAction === 'pdf') {
      setIsPdfViewModalOpen(true);
    }

    setPendingAction(null);
    setIsEditMode(false);
  };

  const resetMandatoryFormState = () => {
    setIsMandatoryFormSubmitted(false);
    setUserInfo(undefined);
  };

  const handleEditForm = () => {
    setIsEditMode(true);
    setPendingAction('pdf'); // Set to pdf since we want to regenerate the document
    setIsUserInfoFormOpen(true);
  };

  const handleQuoteClick = () => {
    if ((userRole === 'sales' || userRole === 'partner') && salesUser) {

      setPendingAction('quote');
      setIsUserInfoFormOpen(true);
    } else {

      setIsQuoteModalOpen(true);
    }
  };

  const handlePdfClick = () => {

    if ((userRole === 'sales' || userRole === 'partner') && !salesUser) {

      alert('Sales user information is missing. Please log in again.');
      return;
    }

    if ((userRole === 'sales' || userRole === 'partner') && !isMandatoryFormSubmitted) {
      setPendingAction('pdf');
      setIsUserInfoFormOpen(true);
      return;
    }

    if (!userInfo) {
      setPendingAction('pdf');
      setIsUserInfoFormOpen(true);
    } else {
      setIsPdfViewModalOpen(true);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedProduct) return;

    if ((userRole === 'sales' || userRole === 'partner') && !salesUser) {

      alert('Sales user information is missing. Please log in again.');
      return;
    }

    if ((userRole === 'sales' || userRole === 'partner') && !isMandatoryFormSubmitted) {
      setPendingAction('pdf');
      setIsUserInfoFormOpen(true);
      return;
    }

    try {

      const currentUserType = userInfo?.userType || 'End User';

      const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
        currentUserType === 'SI/Channel Partner'
          ? 'Channel'
          : currentUserType;

      const blob = await generateConfigurationPdf(
        config,
        selectedProduct,
        fixedCabinetGrid,
        selectedController,
        selectedMode,
        userInfo
          ? { ...userInfo, userType: legacyUserTypeForPricing }
          : { fullName: '', email: '', phoneNumber: '', userType: legacyUserTypeForPricing },
        salesUser,
        quotationId,
        customPricing.enabled ? customPricing : undefined
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedProduct.name}-Configuration-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {

      let errorMessage = 'Failed to generate PDF file. Please try again.';
      if (error?.message) {
        if (error.message.includes('canvas')) {
          errorMessage = 'Failed to render PDF pages. This may be due to image loading issues. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'PDF generation timed out. The document may be too large. Please try again.';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS error: Unable to load images for PDF. Please contact support.';
        } else {
          errorMessage = `PDF generation error: ${error.message}`;
        }
      }

      alert(errorMessage);
    }
  };

  const handleDownloadDocx = async () => {
    if (!selectedProduct) return;

    try {

      const currentUserType = userInfo?.userType || 'End User';

      const blob = await generateConfigurationDocx(
        config,
        selectedProduct,
        fixedCabinetGrid,
        selectedController,
        selectedMode,
        userInfo ? {
          ...userInfo,
          userType: currentUserType === 'SI/Channel Partner' ? 'Channel' : currentUserType
        } : {
          fullName: '',
          email: '',
          phoneNumber: '',
          userType: currentUserType === 'SI/Channel Partner' ? 'Channel' : currentUserType
        },
        salesUser,
        quotationId,
        customPricing.enabled ? customPricing : undefined
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedProduct.name}-Configuration-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {

      alert('Failed to generate DOCX file. Please try again.');
    }
  };

  const handleViewPdf = () => {
    if (!selectedProduct) return;
    setIsPdfViewModalOpen(true);
  };

  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');

  function getJumboFixedGrid(product: Product) {
    if (!product) return null;
    if (product.category?.toLowerCase() !== 'jumbo series') return null;
    if (product.name.toLowerCase().includes('p2.5') || product.name.toLowerCase().includes('p4')) {
      return { columns: 7, rows: 9 };
    }
    if (product.name.toLowerCase().includes('p6') || product.name.toLowerCase().includes('p5')) {
      return { columns: 11, rows: 8 };
    }
    return null;
  }
  const jumboGrid = selectedProduct ? getJumboFixedGrid(selectedProduct) : null;

  const fixedCabinetGrid = isDigitalStandee
    ? { ...cabinetGrid, columns: 7, rows: 5 }
    : (jumboGrid ? { ...cabinetGrid, ...jumboGrid } : cabinetGrid);

  const handleColumnsChange = (columns: number) => {
    if (isDigitalStandee || jumboGrid) return;
    if (!selectedProduct) return;
    const newWidth = columns * selectedProduct.cabinetDimensions.width;
    updateWidth(newWidth);
  };

  const handleRowsChange = (rows: number) => {
    if (isDigitalStandee || jumboGrid) return;
    if (!selectedProduct) return;
    const newHeight = rows * selectedProduct.cabinetDimensions.height;
    updateHeight(newHeight);
  };

  const previousProductIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedProduct) {
      previousProductIdRef.current = undefined;
      return;
    }

    const currentProductId = selectedProduct.id;
    const isProductChanging = previousProductIdRef.current !== currentProductId;

    if (isProductChanging) {
      previousProductIdRef.current = currentProductId;

      const timer = setTimeout(() => {

        if (selectedProduct.category?.toLowerCase().includes('digital standee')) {
          updateWidth(selectedProduct.cabinetDimensions.width);
          updateHeight(selectedProduct.cabinetDimensions.height);
        } else if (jumboGrid) {
          updateWidth(selectedProduct.cabinetDimensions.width);
          updateHeight(selectedProduct.cabinetDimensions.height);
        } else {

          const isFromWizard = initialConfig?.selectedProduct?.id === selectedProduct.id;

          if (!isFromWizard) {

            const cabinetWidth = selectedProduct.cabinetDimensions.width || 600;
            const cabinetHeight = selectedProduct.cabinetDimensions.height || 337.5;
            const initialWidth = cabinetWidth * 3;
            const initialHeight = cabinetHeight * 3;
            updateWidth(initialWidth);
            updateHeight(initialHeight);
          }

        }
      }, 150); // Small delay to let initialConfig useEffect run first

      return () => clearTimeout(timer);
    }

  }, [selectedProduct?.id]); // Only depend on product ID - this prevents the effect from running when dimensions change

  if (showDashboard && (userRole === 'super' || userRole === 'super_admin')) {
    return (
      <SuperUserDashboard
        onBack={() => {
          if (onDashboardClose) {
            onDashboardClose();
          } else {
            setShowDashboardInternal(false);
          }
        }}
        loggedInUser={salesUser ? {
          role: salesUser.role,
          name: salesUser.name,
          email: salesUser.email
        } : undefined}
      />
    );
  }

  if (showSalesDashboardProp && userRole === 'sales') {
    return (
      <SalesDashboard
        onBack={() => {
          if (onSalesDashboardClose) {
            onSalesDashboardClose();
          }
        }}
        onLogout={onSalesLogout}
        loggedInUser={salesUser ? {
          role: salesUser.role,
          name: salesUser.name,
          email: salesUser.email
        } : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-black shadow-lg relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
          {/* Mobile Menu Button */}
          <div className="lg:hidden absolute top-3 right-3 z-20 sm:top-4 sm:right-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors bg-black/20 backdrop-blur-sm"
              aria-label="Toggle sidebar menu"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {/* Mobile indicator when sidebar is closed */}
            {!isSidebarOpen && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>

          {/* Sales Login/Logout - Top Right */}
          {/* Sales Login/Logout - Top Right */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 lg:top-6 lg:right-6 z-50">
            {(userRole === 'super' || userRole === 'super_admin' || userRole === 'sales' || userRole === 'partner') ? (
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg transition-all hover:bg-black/50">
                {/* 1. First Name (Left) */}
                <div className="flex items-center px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 mr-1">
                  <User className="w-3.5 h-3.5 text-purple-300 mr-2" />
                  <span className="text-white text-sm font-medium tracking-wide">
                    {salesUser?.name?.split(' ')[0] || 'User'}
                  </span>
                </div>

                {/* 2. Dashboard Button */}
                <button
                  onClick={() => {
                    if (userRole === 'sales' || userRole === 'partner') {
                      if (onSalesDashboardOpen) onSalesDashboardOpen();
                    } else {
                      if (onDashboardOpen) onDashboardOpen();
                      else setShowDashboardInternal(true);
                    }
                  }}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 shadow-sm border group
                    ${(showDashboard || showSalesDashboardProp)
                      ? 'bg-purple-600 text-white border-purple-400/50 shadow-purple-500/20'
                      : 'bg-white/10 text-gray-200 hover:bg-purple-600 hover:text-white border-white/10 hover:border-purple-500/50'}
                  `}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Dashboard</span>
                </button>

                {/* 3. Logout Button */}
                <button
                  onClick={onSalesLogout}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-200 hover:bg-red-600 hover:text-white text-sm font-medium rounded-lg transition-all duration-300 border border-red-500/20 hover:border-red-500/50 group"
                >
                  <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onShowSalesLogin}
                className="px-5 py-2 bg-blue-600/90 hover:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 border border-white/10 backdrop-blur-sm flex items-center gap-2"
              >
                <span>🔐</span>
                <span>SALES LOGIN</span>
              </button>
            )}
          </div>

          {/* Logo - Top Left */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 lg:top-6 lg:left-6">
            <img
              src="https://orion-led.com/wp-content/uploads/2025/06/logo-white-1.png"
              alt="Orion LED Logo"
              className="h-8 sm:h-12 lg:h-16 w-auto"
            />
          </div>

          {/* Main Content - Centered */}
          <div className="text-center pt-12 sm:pt-16 lg:pt-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white mb-1 sm:mb-2 lg:mb-3 tracking-tight">
              Orion Led Configurator
            </h1>
            <p className="text-gray-200 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium max-w-2xl mx-auto leading-relaxed px-2 sm:px-4">
              Configure your digital signage display using wide range of products
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${showLeftPanel ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
          transition-transform duration-300 ease-in-out
          w-72 sm:w-80 flex-shrink-0 border-r border-gray-200 bg-white
          ${showLeftPanel ? 'lg:block' : 'lg:hidden'}
        `}>
          <ProductSidebar
            selectedProduct={selectedProduct}
            cabinetGrid={fixedCabinetGrid}
            onColumnsChange={handleColumnsChange}
            onRowsChange={handleRowsChange}
            onSelectProductClick={() => {
              setIsProductSelectorOpen(true);
              setIsSidebarOpen(false); // Close sidebar on mobile when opening product selector
            }}

            onControllerChange={userRole !== 'normal' ? setSelectedController : undefined}
            onModeChange={setSelectedMode}
            controllerSelection={controllerSelection}
            processorDropdownOptions={userRole !== 'normal' ? processorDropdownOptions : undefined}
            onRedundancyChange={setRedundancyEnabled}
            redundancyEnabled={redundancyEnabled}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Mobile Instruction Banner */}
          <div className="lg:hidden bg-gray-50 border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-gray-800">Tap the menu button (☰) to access product settings</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-black hover:text-gray-800 text-xs font-medium"
              >
                Open Menu
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 space-y-3 sm:space-y-6 lg:space-y-8">

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
              <div className="space-y-3 sm:space-y-6">
                <DimensionControls
                  config={config}
                  onWidthChange={updateWidth}
                  onHeightChange={updateHeight}
                  onUnitChange={updateUnit}
                  selectedProduct={selectedProduct}
                />
                <AspectRatioSelector
                  aspectRatios={aspectRatios}
                  selectedRatio={config.aspectRatio}
                  onRatioChange={updateAspectRatio}
                />
              </div>
            </div>

            {/* Tabs Section */}
            <div className="mb-3 sm:mb-6 lg:mb-8">
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                {/* Always show preview tab */}
                <button
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm lg:text-base ${activeTab === 'preview' ? 'bg-black text-white' : 'bg-gray-200'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>

                {/* Show other tabs only when product is selected */}
                {selectedProduct && (
                  <>
                    <button
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm lg:text-base ${activeTab === 'data' ? 'bg-black text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveTab('data')}
                    >
                      Data Wiring
                    </button>
                    <button
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm lg:text-base ${activeTab === 'power' ? 'bg-black text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveTab('power')}
                    >
                      Power Wiring
                    </button>
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-2 sm:p-4">
                {activeTab === 'preview' && (
                  <DisplayPreview
                    config={config}
                    displayDimensions={displayDimensions}
                    selectedProduct={selectedProduct}
                    cabinetGrid={fixedCabinetGrid}
                  />
                )}

                {selectedProduct && activeTab === 'data' && (
                  <DataWiringView
                    product={selectedProduct}
                    cabinetGrid={fixedCabinetGrid}
                    redundancyEnabled={redundancyEnabled}
                    onRedundancyChange={setRedundancyEnabled}
                    controllerSelection={controllerSelection}
                  />
                )}

                {selectedProduct && activeTab === 'power' && (
                  <PowerWiringView product={selectedProduct} cabinetGrid={fixedCabinetGrid} />
                )}
              </div>
            </div>

            {/* Product Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Package className="text-black" size={18} />
                  <div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Select Product</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {selectedProduct ? selectedProduct.name : 'No product selected'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProductSelectorOpen(true)}
                  className="w-full sm:w-auto bg-black text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm lg:text-base"
                >
                  <Package size={14} />
                  <span>Choose Product</span>
                </button>
              </div>

              {selectedProduct && (
                <div className="mt-3 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Category</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">{selectedProduct.category}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Cabinet Size</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {selectedProduct.cabinetDimensions.width} × {selectedProduct.cabinetDimensions.height} mm
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Cabinet Resolution</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {selectedProduct.resolution.width} × {selectedProduct.resolution.height}
                      </p>
                    </div>
                    {/* PRICING SECTION - TEMPORARILY DISABLED
                    To re-enable pricing display, uncomment the section below and remove this comment block.
                    
                    <div>
                      <h4 className="font-medium text-gray-900">Price</h4>
                      <p className="text-gray-600">
                        {(() => {
                          if (
                            selectedProduct.category?.toLowerCase().includes('rental') &&
                            selectedProduct.rentalOption &&
                            selectedProduct.prices
                          ) {

                            const userTypeToPriceKey = (type: string): 'endCustomer' | 'siChannel' | 'reseller' => {
                              if (type === 'siChannel' || type === 'reseller') return type;
                              return 'endCustomer';
                            };
                            const price = selectedProduct.prices[
                              selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet'
                            ][userTypeToPriceKey('endCustomer')];
                            return price
                              ? `₹${price.toLocaleString('en-IN')} (${selectedProduct.rentalOption === 'curve lock' ? 'Curve Lock' : 'Cabinet'})/ft²`
                              : 'Contact for pricing';
                          }
                          let price = selectedProduct.price;

                          return price ? `₹${price.toLocaleString('en-IN')}` : 'Contact for pricing';
                        })()}
                      </p>
                    </div>
                    END PRICING SECTION */}
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Total Cabinets</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">{cabinetGrid.columns * cabinetGrid.rows} units</p>
                    </div>
                    {/* Transparent Series specific properties */}
                    {selectedProduct.category === 'Transparent Series' && (
                      <>
                        {selectedProduct.transparency && (
                          <div>
                            <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Transparency</h4>
                            <p className="text-gray-600 text-xs sm:text-sm">{selectedProduct.transparency}%</p>
                          </div>
                        )}
                        {selectedProduct.scanMode && (
                          <div>
                            <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Scan Mode</h4>
                            <p className="text-gray-600 text-xs sm:text-sm">{selectedProduct.scanMode}</p>
                          </div>
                        )}
                        {selectedProduct.pixelComposition && (
                          <div>
                            <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Pixel Composition</h4>
                            <p className="text-gray-600 text-xs sm:text-sm">{selectedProduct.pixelComposition}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {/* Read More Button */}
                  {selectedProduct.pdf && (
                    <div className="mt-3 sm:mt-4 flex justify-end">
                      <button
                        className="bg-blue-600 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs sm:text-sm lg:text-base"
                        onClick={() => setIsPdfModalOpen(true)}
                      >
                        Read More
                      </button>
                    </div>
                  )}
                  {/* PDF Modal */}
                  {isPdfModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
                      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
                          <h3 className="text-base sm:text-lg lg:text-xl font-semibold">Product PDF</h3>
                          <button
                            className="text-gray-500 hover:text-gray-800 p-2"
                            onClick={() => setIsPdfModalOpen(false)}
                            aria-label="Close"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="h-[70vh] overflow-auto p-2 sm:p-4">
                          {/* PDF Viewer */}
                          <Document
                            file={selectedProduct.pdf}
                            onLoadSuccess={({ numPages }) => {
                              setNumPages(numPages);
                              setPdfError(null);
                            }}
                            onLoadError={(error) => {

                              setPdfError('Failed to load PDF. Please check the browser console for more details.');
                            }}
                            loading={<div className="text-center py-6">Loading PDF...</div>}
                          >
                            {Array.from(new Array(numPages || 0), (_, index) => (
                              <React.Fragment key={`page_${index + 1}`}>
                                <Page
                                  pageNumber={index + 1}
                                  width={Math.min(700, window.innerWidth - 32)}
                                  renderAnnotationLayer={false}
                                  renderTextLayer={false}
                                />
                                {(numPages && index < numPages - 1) && <div className="h-4 bg-gray-200" />}
                              </React.Fragment>
                            ))}
                          </Document>
                          {pdfError && <div className="p-4 text-red-600 bg-red-100 rounded-md">{pdfError}</div>}

                          <div className="mt-2 text-xs sm:text-sm text-gray-500">For full details, <a href={selectedProduct.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">open PDF in new tab</a>.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Configuration Summary</h3>
              <ConfigurationSummary
                config={config}
                cabinetGrid={fixedCabinetGrid}
                selectedProduct={selectedProduct}
                processor={selectedController}
                mode={selectedMode}
              />

              {/* Action Buttons */}
              {selectedProduct && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  {/* Normal Users - Only See Quote Button */}
                  {userRole === 'normal' && (
                    <button
                      onClick={handleQuoteClick}
                      className="inline-flex items-center justify-center px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Send Quote
                    </button>
                  )}

                  {/* Sales Users and Partners - See View and Download Buttons */}
                  {(userRole === 'sales' || userRole === 'partner' || userRole === 'super' || userRole === 'super_admin') && (
                    <>
                      {/* Mandatory Form Notice */}
                      {!isMandatoryFormSubmitted && (
                        <div className="w-full text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 text-sm font-medium">
                            Please complete the mandatory form to access documents
                          </p>
                          <button
                            onClick={() => {
                              setPendingAction('pdf');
                              setIsUserInfoFormOpen(true);
                            }}
                            className="mt-2 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            Complete Form
                          </button>
                        </div>
                      )}

                      {/* Document Access Buttons - Only shown after form submission */}
                      {isMandatoryFormSubmitted && (
                        <>
                          <button
                            onClick={handlePdfClick}
                            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                          >
                            <FileText className="w-5 h-5 mr-2" />
                            View Docs
                          </button>
                          <button
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors border border-gray-300"
                          >
                            <Download className="w-5 h-5 mr-2" />
                            Download PDF
                          </button>
                          <button
                            onClick={handleEditForm}
                            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Form
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Selector Modal */}
      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        onSelectProduct={handleProductSelect}
        selectedProduct={selectedProduct}
      />
      {/* Quote Modal */}
      {selectedProduct && (
        <QuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          onSubmit={(message) => {

            setIsQuoteModalOpen(false);
          }}
          selectedProduct={selectedProduct}
          config={config}
          cabinetGrid={cabinetGrid}
          processor={selectedController}
          mode={selectedMode}
          userInfo={userInfo && userInfo.userType !== 'SI/Channel Partner' ? userInfo : undefined}
          title={(userRole === 'sales' || userRole === 'partner' || userRole === 'super' || userRole === 'super_admin') && salesUser ? 'Sales Quote' : 'Get a Quote'}
          submitButtonText={(userRole === 'sales' || userRole === 'partner' || userRole === 'super' || userRole === 'super_admin') && salesUser ? 'Submit Sales Quote' : 'Submit Quote Request'}
          salesUser={salesUser}
          userRole={userRole}
          quotationId={quotationId}
          customPricing={customPricing}
          onCustomPricingChange={setCustomPricing}
          existingQuotation={activeQuotation ? {
            quotationId: activeQuotation.quotationId,
            customerName: activeQuotation.customerName,
            customerEmail: activeQuotation.customerEmail,
            customerPhone: activeQuotation.customerPhone,
            message: activeQuotation.message,
            userType: activeQuotation.userType === 'reseller' ? 'Reseller' : (activeQuotation.userType === 'siChannel' ? 'SI/Channel Partner' : 'End User')
          } : undefined}
        />
      )}

      {/* PDF View Modal */}
      {selectedProduct && (
        <PdfViewModal
          isOpen={isPdfViewModalOpen}
          onClose={() => setIsPdfViewModalOpen(false)}
          htmlContent={generateConfigurationHtml(
            config,
            selectedProduct,
            fixedCabinetGrid,
            selectedController,
            selectedMode,

            userInfo
              ? {
                fullName: userInfo.fullName,
                email: userInfo.email,
                phoneNumber: userInfo.phoneNumber,
                projectTitle: userInfo.projectTitle,
                address: userInfo.address,
                validity: userInfo.validity,
                paymentTerms: userInfo.paymentTerms,
                warranty: userInfo.warranty,
                userType: userInfo.userType === 'SI/Channel Partner' ? 'Channel' : (userInfo.userType || 'End User')
              }
              : { fullName: '', email: '', phoneNumber: '', userType: 'End User' },
            salesUser,
            quotationId,
            customPricing.enabled ? customPricing : undefined
          )}
          customPricing={customPricing.enabled ? customPricing : undefined}
          onDownload={handleDownloadPdf}
          onDownloadDocx={handleDownloadDocx}
          fileName={`${selectedProduct.name}-Configuration-${new Date().toISOString().split('T')[0]}.pdf`}
          selectedProduct={selectedProduct}
          config={config}
          cabinetGrid={fixedCabinetGrid}
          processor={selectedController}
          mode={selectedMode}

          userInfo={userInfo ? { ...userInfo, userType: userInfo.userType || 'End User' } : undefined}
          salesUser={salesUser}
          userRole={userRole}
          quotationId={quotationId || undefined}
          isEditing={!!activeQuotation}
        />
      )}

      {/* User Info Form Modal - merge T&C from quotation so they always pre-fill when editing */}
      <UserInfoForm
        isOpen={isUserInfoFormOpen}
        onClose={() => {
          setIsUserInfoFormOpen(false);
          setPendingAction(null);
          setIsEditMode(false);
        }}
        onSubmit={handleUserInfoSubmit}
        title={isEditMode ? 'Edit Client Details' : (pendingAction === 'quote' ? 'Get a Quote' : 'View Document')}
        submitButtonText={isEditMode ? 'Update & Regenerate' : (pendingAction === 'quote' ? 'Submit Quote Request' : 'View Document')}
        initialData={(() => {
          const qUser = activeQuotation?.quotationData?.userInfo;
          const base = userInfo ? { ...userInfo } : undefined;
          if (!base && !qUser) return undefined;
          if (!base) return qUser ? {
            fullName: qUser.fullName || qUser.customerName || '',
            email: qUser.email || qUser.customerEmail || '',
            phoneNumber: qUser.phoneNumber || qUser.customerPhone || '',
            projectTitle: qUser.projectTitle || '',
            address: qUser.address || '',
            userType: (qUser.userType === 'Reseller' ? 'Reseller' : qUser.userType === 'SI/Channel Partner' || qUser.userType === 'Channel' ? 'SI/Channel Partner' : 'End User') as 'End User' | 'Reseller' | 'SI/Channel Partner',
            validity: qUser.validity,
            paymentTerms: qUser.paymentTerms,
            warranty: qUser.warranty
          } : undefined;
          return {
            ...base,
            validity: base.validity ?? qUser?.validity,
            paymentTerms: base.paymentTerms ?? qUser?.paymentTerms,
            warranty: base.warranty ?? qUser?.warranty
          };
        })()}
        isEditMode={isEditMode}
        salesUser={salesUser}
        allowedCustomerTypes={salesUser?.allowedCustomerTypes}
        customPricing={customPricing}
        onCustomPricingChange={setCustomPricing}
      />

    </div>
  );
};