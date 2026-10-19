import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, FileText, DollarSign, Package, Clock, MessageSquare, RefreshCw, Percent, Trash2, Search } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { PdfViewModal } from './PdfViewModal';
import { generateConfigurationHtml } from '../utils/docxGenerator';
import { buildExactPricingBreakdownForPdf, resolveDisplayedProductSubtotal } from '../utils/exactPricingBreakdownForPdf';
import { readQuotationAddons, sumQuotationAddons } from '../utils/quotationAddons';
import { applyDiscount, DiscountInfo, getLedDiscountMode, getDiscountUnits, getDiscountUnitLabel } from '../utils/discountCalculator';
import { normalizeOrderQuantity } from '../utils/orderQuantity';
import {
  getQuotationItemSummary,
  getQuotationDisplayTotal,
  normalizeQuotationLineItems,
  filterCustomersByQuotationSearch,
  expandCustomersByQuotationDate,
  toPdfQuotationLineItems,
  priceLineItem,
  toPricingUserTypeCode,
  PersistedQuotationLineItem,
  buildQuotationAccounting
} from '../utils/quotationLineItems';
import { QuotationProductSelectionModal } from './QuotationProductSelectionModal';
import { products } from '../data/products';
import { Save as SaveIcon } from 'lucide-react';

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role: string;
  createdAt: string;
}

interface Quotation {
  quotationId: string;
  projectTitle?: string;
  address?: string;
  productName: string;
  productDetails: any;
  totalPrice: number;
  originalTotalPrice?: number;
  message: string;
  createdAt: string;
  pdfS3Key?: string | null;
  pdfS3Url?: string | null;
  userType?: string;
  userTypeDisplayName?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  clientId?: string;

  exactPricingBreakdown?: {
    pricingScope?: 'line' | 'quotation';
    unitPrice?: number;
    quantity?: number;
    subtotal?: number;
    gstRate: number;
    gstAmount: number;
    processorPrice: number;
    processorGst: number;
    grandTotal: number;
    productSubtotal?: number;
    productGST?: number;
    productTotal?: number;
    processorTotal?: number;
    structureCost?: number;
    structureGST?: number;
    structureTotal?: number;
    installationCost?: number;
    installationGST?: number;
    installationTotal?: number;
    addonsCost?: number;
    addonsGST?: number;
    addonsTotal?: number;
    appliedAddons?: any[];
    customAddons?: { description: string; price: number }[];
    customPricing?: any;
    discount?: {
      discountType?: string;
      discountPercent?: number;
      discountAmountPerUnit?: number;
      discountAmount?: number;
      numberOfUnits?: number;
      ledDiscountMode?: string;
      originalProductTotal?: number;
      originalProcessorTotal?: number;
      originalGrandTotal?: number;
      discountedProductTotal?: number;
      discountedProcessorTotal?: number;
      discountedGrandTotal?: number;
      ledOverride?: { amountPerUnit?: number };
      controllerOverride?: { amountPerUnit?: number };
    };
  };
  exactProductSpecs?: {
    productName: string;
    category: string;
    pixelPitch: number;
    resolution: any;
    cabinetDimensions: any;
    displaySize: any;
    aspectRatio: string;
    processor: string;
    mode: string;
    cabinetGrid: any;
  };
  quotationData?: any;
  originalPricingBreakdown?: any;
}

interface Customer {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  userType: string;
  userTypeDisplayName: string;
  company?: string;
  quotations: Quotation[];
}

interface SalesPersonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesPersonId: string | null;
  loggedInUser?: {
    role?: string;
    name?: string;
    email?: string;
  };
}

function resolveLineItemProduct(item: PersistedQuotationLineItem): any {
  if (item.product?.id) {
    return products.find(p => p.id === item.product!.id) || item.product;
  }
  if (item.productId) {
    return products.find(p => p.id === item.productId) || item.product;
  }
  return item.product || null;
}

function lineItemHasDiscount(item: PersistedQuotationLineItem): boolean {
  const d = item.discount;
  if (!d) return false;
  return (d.discountAmount ?? 0) > 0 || !!d.discountType || !!d.ledOverride || !!d.controllerOverride;
}

function loadDiscountFormFromLineItem(item: PersistedQuotationLineItem | null | undefined): {
  type: 'led' | 'controller' | null;
  amountPerUnit: number;
  percent: number;
} {
  if (!item?.discount) {
    return { type: null, amountPerUnit: 0, percent: 0 };
  }
  const d = item.discount;
  const type = (d.discountType as 'led' | 'controller') || null;
  const amountPerUnit =
    (type === 'led'
      ? (d.ledOverride?.amountPerUnit ?? d.discountAmountPerUnit)
      : (d.controllerOverride?.amountPerUnit ?? d.discountAmountPerUnit)) || 0;
  return {
    type,
    amountPerUnit,
    percent: d.discountPercent || 0
  };
}

export const SalesPersonDetailsModal: React.FC<SalesPersonDetailsModalProps> = ({
  isOpen,
  onClose,
  salesPersonId,
  loggedInUser
}) => {
  const [salesPerson, setSalesPerson] = useState<SalesPerson | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfHtmlContent, setPdfHtmlContent] = useState<string>('');

  const [editingDiscountQuotationId, setEditingDiscountQuotationId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'led' | 'controller' | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmountPerUnit, setDiscountAmountPerUnit] = useState<number>(0);
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false);
  const [discountSelectionQuotationId, setDiscountSelectionQuotationId] = useState<string | null>(null);
  const [selectedDiscountLineItemId, setSelectedDiscountLineItemId] = useState<string | null>(null);
  const [selectedDiscountProductIndex, setSelectedDiscountProductIndex] = useState<number>(0);

  useEffect(() => {
    if (isOpen && salesPersonId) {
      fetchSalesPersonDetails();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen, salesPersonId]);

  const fetchSalesPersonDetails = async () => {
    if (!salesPersonId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await salesAPI.getSalesPersonDetails(salesPersonId + '?t=' + Date.now());

      const allQuotationIds: string[] = [];
      const allQuotationPrices: number[] = [];

      response.customers?.forEach((customer, custIndex) => {

        customer.quotations?.forEach((quotation: Quotation, qIndex: number) => {
          allQuotationIds.push(quotation.quotationId);
          allQuotationPrices.push(quotation.totalPrice);

        });
      });

      const uniqueIds = [...new Set(allQuotationIds)];
      if (allQuotationIds.length === uniqueIds.length) {

      } else {

        const duplicates = allQuotationIds.filter((id, index) => allQuotationIds.indexOf(id) !== index);

      }

      const uniquePrices = [...new Set(allQuotationPrices)];

      setSalesPerson(response.salesPerson);
      setCustomers(response.customers || []);
      setTotalQuotations(response.totalQuotations);
      setTotalCustomers(response.totalCustomers);
    } catch (err) {

      setError('Failed to load sales person details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async (quotation: Quotation) => {
    try {
      setSelectedQuotation(quotation);

      if (quotation.exactPricingBreakdown && quotation.exactProductSpecs) {

        const productDetails = quotation.productDetails;
        const exactSpecs = quotation.exactProductSpecs;
        const product = productDetails?.product || productDetails;

        let config = quotation.quotationData?.config;
        if (!config && exactSpecs.displaySize) {
          config = {
            width: (exactSpecs.displaySize.width * 1000) || 0,
            height: (exactSpecs.displaySize.height * 1000) || 0,
            unit: 'mm'
          };
        }

        const cabinetGrid = exactSpecs.cabinetGrid || productDetails?.cabinetGrid;
        const processor = exactSpecs.processor || productDetails?.processor || null;
        const mode = exactSpecs.mode || productDetails?.mode || undefined;

        const customer = customers.find(c =>
          c.quotations.some(q => q.quotationId === quotation.quotationId)
        );

        let userTypeForHtml = 'End User';
        if (quotation.userType === 'siChannel') {
          userTypeForHtml = 'SI/Channel Partner';
        } else if (quotation.userType === 'reseller') {
          userTypeForHtml = 'Reseller';
        }

        const userInfo = {
          userType: userTypeForHtml as any,
          fullName: customer?.customerName || '',
          email: customer?.customerEmail || '',
          phoneNumber: customer?.customerPhone || '',
          projectTitle: quotation.quotationData?.userInfo?.projectTitle || quotation.projectTitle || '',
          address: quotation.quotationData?.userInfo?.address || quotation.address || ''
        };

        const htmlContent = generateConfigurationHtml(
          config,
          product,
          cabinetGrid,
          processor,
          mode,
          userInfo,
          salesPerson ? {
            email: salesPerson.email,
            name: salesPerson.name,
            contactNumber: salesPerson.contactNumber,
            location: salesPerson.location
          } : null,
          quotation.quotationId,
          quotation.quotationData?.customPricing || quotation.exactPricingBreakdown?.customPricing || undefined,
          buildExactPricingBreakdownForPdf(quotation.exactPricingBreakdown, {
            logContext: `viewPdf (quotationId=${quotation.quotationId})`
          }),
          quotation.quotationData?.wireType,
          quotation.quotationData?.nexaAddons || quotation.exactPricingBreakdown?.appliedAddons?.map((addon: any) => addon.name),
          normalizeOrderQuantity(
            (quotation.quotationData as any)?.orderQuantity ??
            (quotation.exactPricingBreakdown as any)?.orderQuantity ??
            1
          ),
          toPdfQuotationLineItems(normalizeQuotationLineItems(quotation))
        );

        setPdfHtmlContent(htmlContent);
        setIsPdfModalOpen(true);
        return;
      }

      if (quotation.productDetails?.pdfPage6HTML) {

        setPdfHtmlContent(quotation.productDetails.pdfPage6HTML);
        setIsPdfModalOpen(true);
        return;
      }

      alert('PDF data not available for this quotation.');

    } catch (error) {

      alert('Failed to load PDF. Please try again.');
    }
  };

  const clearDiscountFormState = () => {
    setEditingDiscountQuotationId(null);
    setDiscountType(null);
    setDiscountPercent(0);
    setDiscountAmountPerUnit(0);
    setSelectedDiscountLineItemId(null);
    setSelectedDiscountProductIndex(0);
    setDiscountSelectionQuotationId(null);
  };

  const openDiscountFormForLineItem = (
    quotation: Quotation,
    item: PersistedQuotationLineItem,
    productIndex: number
  ) => {
    setSelectedDiscountLineItemId(item.id || `legacy-${productIndex}`);
    setSelectedDiscountProductIndex(productIndex);
    setEditingDiscountQuotationId(quotation.quotationId);

    const loaded = loadDiscountFormFromLineItem(item);
    // Fallback to quotation-level discount only for single-product / legacy
    if (!loaded.type) {
      const lineItems = normalizeQuotationLineItems(quotation);
      if (lineItems.length <= 1) {
        const hasDiscountInQuotationData = quotation.quotationData?.discountApplied;
        const hasDiscountInBreakdown = quotation.exactPricingBreakdown?.discount
          && (quotation.exactPricingBreakdown?.discount?.discountAmount ?? 0) > 0;
        if (hasDiscountInQuotationData) {
          const di = quotation.quotationData.discountInfo;
          setDiscountType(di?.type || null);
          setDiscountPercent(di?.percent || 0);
          setDiscountAmountPerUnit(di?.amountPerUnit || 0);
          return;
        }
        if (hasDiscountInBreakdown) {
          const bd = quotation.exactPricingBreakdown?.discount;
          const type = bd?.discountType || (bd?.discountPercent && bd.discountPercent > 0 ? 'controller' : 'led');
          setDiscountType((type as 'led' | 'controller') || null);
          setDiscountPercent(bd?.discountPercent || 0);
          setDiscountAmountPerUnit(bd?.discountAmountPerUnit || 0);
          return;
        }
      }
    }
    setDiscountType(loaded.type);
    setDiscountPercent(loaded.percent);
    setDiscountAmountPerUnit(loaded.amountPerUnit);
  };

  const beginDiscountForQuotation = (quotation: Quotation) => {
    const lineItems = normalizeQuotationLineItems(quotation);
    if (lineItems.length > 1) {
      setDiscountSelectionQuotationId(quotation.quotationId);
      setSelectedDiscountLineItemId(null);
      setEditingDiscountQuotationId(null);
      return;
    }
    if (lineItems.length === 1) {
      openDiscountFormForLineItem(quotation, lineItems[0], 0);
      return;
    }
    // Legacy single-product without lineItems array
    setSelectedDiscountLineItemId(null);
    setSelectedDiscountProductIndex(0);
    setEditingDiscountQuotationId(quotation.quotationId);
    const hasDiscountInQuotationData = quotation.quotationData?.discountApplied;
    const hasDiscountInBreakdown = quotation.exactPricingBreakdown?.discount
      && (quotation.exactPricingBreakdown?.discount?.discountAmount ?? 0) > 0;
    if (hasDiscountInQuotationData) {
      const di = quotation.quotationData.discountInfo;
      setDiscountType(di?.type || null);
      setDiscountPercent(di?.percent || 0);
      setDiscountAmountPerUnit(di?.amountPerUnit || 0);
    } else if (hasDiscountInBreakdown) {
      const bd = quotation.exactPricingBreakdown?.discount;
      const type = bd?.discountType || (bd?.discountPercent && bd.discountPercent > 0 ? 'controller' : 'led');
      setDiscountType((type as 'led' | 'controller') || null);
      setDiscountPercent(bd?.discountPercent || 0);
      setDiscountAmountPerUnit(bd?.discountAmountPerUnit || 0);
    } else {
      setDiscountType(null);
      setDiscountPercent(0);
      setDiscountAmountPerUnit(0);
    }
  };

  const buildBasePricingForLineItem = (
    quotation: Quotation,
    item: PersistedQuotationLineItem
  ): any => {
    const product = resolveLineItemProduct(item);
    if (!product) return null;

    const userTypeCode = toPricingUserTypeCode(
      item.userType || quotation.userTypeDisplayName || quotation.userType
    );
    const customPricing = item.customPricing?.enabled
      ? item.customPricing
      : quotation.quotationData?.customPricing;

    const pricingResult = priceLineItem(
      {
        product,
        config: item.config || { width: 0, height: 0, unit: 'mm' },
        cabinetGrid: item.cabinetGrid || { columns: 1, rows: 1, totalWidth: 0, totalHeight: 0 },
        processor: item.processor || null,
        wireType: item.wireType,
        nexaAddons: item.nexaAddons,
        orderQuantity: item.orderQuantity
      },
      userTypeCode,
      customPricing?.enabled ? customPricing : undefined
    );

    if (!pricingResult.isAvailable) return null;
    return pricingResult;
  };

  const persistMultiProductDiscountUpdate = async (
    quotation: Quotation,
    updatedLineItems: PersistedQuotationLineItem[],
    selectedItem: PersistedQuotationLineItem,
    selectedDiscountedPricing: any | null
  ) => {
    const quotationAddons = readQuotationAddons(
      quotation.quotationData?.customAddons,
      quotation.exactPricingBreakdown?.customAddons
    );
    const accounting = buildQuotationAccounting(updatedLineItems, quotationAddons);
    const multiGrandTotal = accounting.grandTotal;
    const multiOriginalTotal = accounting.originalTotal;

    const anyDiscount = updatedLineItems.some(lineItemHasDiscount);
    const selectedDiscount = selectedItem.discount;

    const newExactPricingBreakdown = accounting.breakdown;

    const productDetails = quotation.productDetails;
    const exactSpecs = (quotation.exactProductSpecs || {}) as any;
    const primaryProduct = resolveLineItemProduct(updatedLineItems[0]) || productDetails?.product || productDetails;
    let config = updatedLineItems[0]?.config || quotation.quotationData?.config;
    if (!config && exactSpecs?.displaySize) {
      config = {
        width: (exactSpecs.displaySize.width * 1000) || 0,
        height: (exactSpecs.displaySize.height * 1000) || 0,
        unit: 'mm'
      };
    }

    let userTypeForHtml = 'End User';
    if (quotation.userType === 'siChannel') userTypeForHtml = 'SI/Channel Partner';
    else if (quotation.userType === 'reseller') userTypeForHtml = 'Reseller';

    const customer = customers.find(c =>
      c.quotations.some(q => q.quotationId === quotation.quotationId)
    );
    const userInfo = {
      userType: userTypeForHtml as any,
      fullName: customer?.customerName || '',
      email: customer?.customerEmail || '',
      phoneNumber: customer?.customerPhone || '',
      projectTitle: quotation.quotationData?.userInfo?.projectTitle || quotation.projectTitle || '',
      address: quotation.quotationData?.userInfo?.address || quotation.address || ''
    };

    const previewHtml = generateConfigurationHtml(
      config,
      primaryProduct,
      updatedLineItems[0]?.cabinetGrid || exactSpecs.cabinetGrid || productDetails?.cabinetGrid,
      updatedLineItems[0]?.processor || exactSpecs.processor || productDetails?.processor || null,
      updatedLineItems[0]?.mode || exactSpecs.mode || productDetails?.mode || undefined,
      userInfo,
      salesPerson ? {
        email: salesPerson.email,
        name: salesPerson.name,
        contactNumber: salesPerson.contactNumber,
        location: salesPerson.location
      } : null,
      quotation.quotationId,
      quotation.quotationData?.customPricing,
      buildExactPricingBreakdownForPdf(newExactPricingBreakdown, {
        logContext: `multiProductDiscount PDF (quotationId=${quotation.quotationId})`
      }),
      quotation.quotationData?.wireType,
      quotation.quotationData?.nexaAddons,
      normalizeOrderQuantity(updatedLineItems[0]?.orderQuantity || 1),
      toPdfQuotationLineItems(updatedLineItems as any)
    );

    const { generatePdfFromHtml } = await import('../utils/docxGenerator');
    const pdfBlob = await generatePdfFromHtml(previewHtml);
    const pdfBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });

    const updateData = {
      totalPrice: multiGrandTotal,
      originalTotalPrice: multiOriginalTotal,
      exactPricingBreakdown: newExactPricingBreakdown,
      originalPricingBreakdown: accounting.originalBreakdown,
      pdfBase64,
      quotationData: {
        ...quotation.quotationData,
        customAddons: quotationAddons,
        lineItems: updatedLineItems,
        updatedAt: new Date().toISOString(),
        discountApplied: anyDiscount,
        discountInfo: selectedDiscount
          ? {
              type: selectedDiscount.discountType,
              percent: 0,
              amount: selectedDiscount.discountAmount || 0,
              amountPerUnit: selectedDiscount.discountAmountPerUnit || 0,
              numberOfUnits: selectedDiscount.numberOfUnits || 0,
              ledDiscountMode: selectedDiscount.ledDiscountMode || 'none',
              lineItemId: selectedItem.id,
              productIndex: selectedDiscountProductIndex
            }
          : (anyDiscount ? quotation.quotationData?.discountInfo : null)
      }
    };

    await salesAPI.updateQuotation(quotation.quotationId, updateData);
    clearDiscountFormState();
    fetchSalesPersonDetails();
  };

  const handleApplyDiscountToSelectedProduct = async (
    quotation: Quotation,
    lineItemId = selectedDiscountLineItemId
  ) => {
    if (!discountType) {
      alert('Please select a discount type');
      return;
    }
    if (discountType === 'led' && discountAmountPerUnit <= 0) {
      alert('Please enter a valid override unit price');
      return;
    }
    if (discountType === 'controller' && discountAmountPerUnit <= 0) {
      alert('Please enter a valid controller override price > 0');
      return;
    }
    if (!lineItemId) {
      alert('Please select a product to apply the discount to.');
      return;
    }

    try {
      setIsUpdatingDiscount(true);
      const lineItems = normalizeQuotationLineItems(quotation);
      const targetIndex = lineItems.findIndex(
        li => (li.id || '') === lineItemId
      );
      if (targetIndex < 0) {
        throw new Error('Selected product was not found on this quotation.');
      }

      const targetItem = lineItems[targetIndex];
      const product = resolveLineItemProduct(targetItem);
      if (!product) {
        throw new Error('Could not resolve product details for the selected line item.');
      }

      const basePricing = buildBasePricingForLineItem(quotation, targetItem);
      if (!basePricing) {
        throw new Error('Could not calculate base pricing for the selected product.');
      }

      // If another override already exists on this product, preserve it when applying the other type
      let pricingForDiscount = { ...basePricing };
      const existing = targetItem.discount;
      if (discountType === 'controller' && existing?.ledOverride?.amountPerUnit) {
        const ledInfo: DiscountInfo = {
          discountType: 'led',
          discountPercent: 0,
          discountAmountPerUnit: existing.ledOverride.amountPerUnit,
          numberOfUnits: existing.ledOverride.numberOfUnits
            || getDiscountUnits(product, targetItem.cabinetGrid, targetItem.config),
          ledDiscountMode: (existing.ledOverride.ledDiscountMode as any)
            || getLedDiscountMode(product)
        };
        pricingForDiscount = applyDiscount(pricingForDiscount, ledInfo);
      }
      if (discountType === 'led' && existing?.controllerOverride?.amountPerUnit) {
        const ctrlInfo: DiscountInfo = {
          discountType: 'controller',
          discountPercent: 0,
          discountAmountPerUnit: existing.controllerOverride.amountPerUnit,
          numberOfUnits: 1,
          ledDiscountMode: 'none'
        };
        pricingForDiscount = applyDiscount(pricingForDiscount, ctrlInfo);
      }

      let discountInfo: DiscountInfo;
      if (discountType === 'led') {
        const ledMode = getLedDiscountMode(product);
        const units = getDiscountUnits(product, targetItem.cabinetGrid, targetItem.config);
        discountInfo = {
          discountType: 'led',
          discountPercent: 0,
          discountAmountPerUnit,
          numberOfUnits: units,
          ledDiscountMode: ledMode
        };
      } else {
        discountInfo = {
          discountType: 'controller',
          discountPercent: 0,
          discountAmountPerUnit,
          numberOfUnits: 1,
          ledDiscountMode: 'none'
        };
      }

      const discountedPricing = applyDiscount(pricingForDiscount, discountInfo);
      const preservedLedOverride = discountType === 'led'
        ? {
            amountPerUnit: discountAmountPerUnit,
            numberOfUnits: discountInfo.numberOfUnits,
            ledDiscountMode: discountInfo.ledDiscountMode
          }
        : existing?.ledOverride;
      const preservedControllerOverride = discountType === 'controller'
        ? { amountPerUnit: discountAmountPerUnit }
        : existing?.controllerOverride;

      const lineDiscount = {
        discountType,
        discountPercent: 0,
        discountAmountPerUnit,
        numberOfUnits: discountInfo.numberOfUnits,
        ledDiscountMode: discountInfo.ledDiscountMode,
        ledOverride: preservedLedOverride,
        controllerOverride: preservedControllerOverride,
        originalProductTotal: basePricing.productTotal,
        originalProcessorTotal: basePricing.processorTotal,
        originalGrandTotal: basePricing.grandTotal,
        discountedProductTotal: discountedPricing.discountedProductTotal,
        discountedProcessorTotal: discountedPricing.discountedProcessorTotal,
        discountedGrandTotal: discountedPricing.grandTotal,
        discountAmount: Math.round((basePricing.productTotal - discountedPricing.productTotal +
          basePricing.processorTotal - discountedPricing.processorTotal) * 100) / 100
      };

      const updatedPricing = {
        unitPrice: discountedPricing.unitPrice,
        quantity: discountedPricing.quantity,
        orderQuantity: discountedPricing.orderQuantity,
        unitGrandTotal: discountedPricing.unitGrandTotal,
        productSubtotal: discountedPricing.productSubtotal,
        productTotal: discountedPricing.productTotal,
        processorPrice: discountedPricing.processorPrice,
        processorTotal: discountedPricing.processorTotal,
        structureCost: discountedPricing.structureCost,
        structureTotal: discountedPricing.structureTotal,
        installationCost: discountedPricing.installationCost,
        installationTotal: discountedPricing.installationTotal,
        addonsCost: discountedPricing.addonsCost,
        addonsTotal: discountedPricing.addonsTotal,
        appliedAddons: discountedPricing.appliedAddons,
        grandTotal: discountedPricing.grandTotal,
        discount: lineDiscount
      };

      const updatedLineItems = lineItems.map((li, idx) =>
        idx === targetIndex
          ? {
              ...li,
              pricing: updatedPricing,
              discount: lineDiscount
            }
          : li
      );

      await persistMultiProductDiscountUpdate(
        quotation,
        updatedLineItems,
        updatedLineItems[targetIndex],
        discountedPricing
      );
    } catch (error: any) {
      alert(`Failed to update discount: ${error.message}`);
    } finally {
      setIsUpdatingDiscount(false);
    }
  };

  const handleRemoveDiscountFromSelectedProduct = async (quotation: Quotation) => {
    if (!selectedDiscountLineItemId) {
      alert('Please select a product to remove the discount from.');
      return;
    }
    if (!window.confirm('Remove discount from the selected product?')) return;

    try {
      setIsUpdatingDiscount(true);
      const lineItems = normalizeQuotationLineItems(quotation);
      const targetIndex = lineItems.findIndex(
        li => (li.id || '') === selectedDiscountLineItemId
      );
      if (targetIndex < 0) {
        throw new Error('Selected product was not found on this quotation.');
      }

      const targetItem = lineItems[targetIndex];
      const basePricing = buildBasePricingForLineItem(quotation, targetItem);
      if (!basePricing) {
        throw new Error('Could not recalculate base pricing for the selected product.');
      }

      const updatedPricing = {
        unitPrice: basePricing.unitPrice,
        quantity: basePricing.quantity,
        orderQuantity: basePricing.orderQuantity,
        unitGrandTotal: basePricing.unitGrandTotal,
        productSubtotal: basePricing.productSubtotal,
        productTotal: basePricing.productTotal,
        processorPrice: basePricing.processorPrice,
        processorTotal: basePricing.processorTotal,
        structureCost: basePricing.structureCost,
        structureTotal: basePricing.structureTotal,
        installationCost: basePricing.installationCost,
        installationTotal: basePricing.installationTotal,
        addonsCost: basePricing.addonsCost,
        addonsTotal: basePricing.addonsTotal,
        appliedAddons: basePricing.appliedAddons,
        grandTotal: basePricing.grandTotal
      };

      const updatedLineItems = lineItems.map((li, idx) =>
        idx === targetIndex
          ? {
              ...li,
              pricing: updatedPricing,
              discount: undefined
            }
          : li
      );

      await persistMultiProductDiscountUpdate(
        quotation,
        updatedLineItems,
        { ...updatedLineItems[targetIndex], discount: undefined },
        null
      );
    } catch (error: any) {
      alert(`Failed to remove discount: ${error.message}`);
    } finally {
      setIsUpdatingDiscount(false);
    }
  };

  const handleApplyDiscount = async (quotation: Quotation) => {
    const lineItems = normalizeQuotationLineItems(quotation);
    const lineItemId = selectedDiscountLineItemId || lineItems[0]?.id || 'legacy-0';
    await handleApplyDiscountToSelectedProduct(quotation, lineItemId);
  };

  const handleDeleteQuotation = async (quotationId: string) => {

    if (loggedInUser?.role !== 'super' && loggedInUser?.role !== 'super_admin') {
      alert('Only super admins can delete quotations.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      return;
    }

    try {
      await salesAPI.deleteQuotation(quotationId);

      fetchSalesPersonDetails();
    } catch (error: any) {

      alert(`Failed to delete quotation: ${error.message}`);
    }
  };

  const filteredCustomers = expandCustomersByQuotationDate(
    filterCustomersByQuotationSearch(
      customers,
      searchQuery,
      salesPerson?.name
    )
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {loading ? 'Loading...' : salesPerson?.name || 'Sales Person Details'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSalesPersonDetails}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sales person details...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={fetchSalesPersonDetails}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : salesPerson ? (
            <div className="p-6">
              {/* Sales Person Info */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Person Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{salesPerson.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{salesPerson.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Contact Number</p>
                      <p className="font-medium">{salesPerson.contactNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{salesPerson.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Joined</p>
                      <p className="font-medium">{new Date(salesPerson.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Total Quotations</p>
                      <p className="font-medium">{totalQuotations}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customers and Quotations */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Clients & Quotations ({totalCustomers} clients, {totalQuotations} quotations)
                  </h3>
                  <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search quotation ID, customer, or company..."
                      className="pl-9 pr-9 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search quotations"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No quotations found for this sales person.</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No quotations match "{searchQuery.trim()}".</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredCustomers.map((customer, customerIndex) => (
                      <div key={`customer-${customer.customerEmail}-${customerIndex}`} className="border border-gray-200 rounded-lg p-6">
                        {/* Customer Info */}
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">{customer.customerName}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{customer.customerEmail}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{customer.customerPhone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{customer.userTypeDisplayName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quotations */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">
                            Quotation
                          </h5>
                          <div className="space-y-3">
                            {customer.quotations.map((quotation, quotationIndex) => {

                              return (
                                <div key={quotation.quotationId} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                  {/* Header with Product */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <Package className="w-5 h-5 text-blue-600" />
                                      <div>
                                        <p className="font-semibold text-gray-900 text-lg">{quotation.productName}</p>
                                        {(() => {
                                          const itemSummary = getQuotationItemSummary(quotation);
                                          const lineItems = normalizeQuotationLineItems(quotation);
                                          return (
                                            <>
                                              <p className="text-sm text-gray-600">
                                                {itemSummary.itemCount} item{itemSummary.itemCount === 1 ? '' : 's'}
                                                {itemSummary.totalQuantity > 0 ? ` · Qty ${itemSummary.totalQuantity}` : ''}
                                              </p>
                                              {itemSummary.itemCount > 1 && (
                                                <ul className="mt-1 text-xs text-gray-500 space-y-0.5">
                                                  {lineItems.map((li, idx) => (
                                                    <li key={li.id || idx}>
                                                      Product {idx + 1}: {li.productName}
                                                      {li.orderQuantity > 1 ? ` × ${li.orderQuantity}` : ''}
                                                      {typeof li.pricing?.grandTotal === 'number'
                                                        ? ` · ₹${Math.round(li.pricing.grandTotal).toLocaleString('en-IN')}`
                                                        : ''}
                                                      {lineItemHasDiscount(li) ? ' · Discount applied' : ''}
                                                    </li>
                                                  ))}
                                                </ul>
                                              )}
                                            </>
                                          );
                                        })()}
                                        <p className="text-sm text-gray-600">Quotation ID: {quotation.quotationId}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleViewPdf(quotation)}
                                        className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                        title="View/Download PDF"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span>View PDF</span>
                                      </button>

                                      {/* Delete Button - Super Admin Only */}
                                      {(loggedInUser?.role === 'super' || loggedInUser?.role === 'super_admin') && (
                                        <button
                                          onClick={() => handleDeleteQuotation(quotation.quotationId)}
                                          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                                          title="Delete Quotation"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Product Specifications Grid */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                    {/* Basic Product Info */}
                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                      <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <Package className="w-4 h-4 mr-2 text-blue-600" />
                                        Product Specifications
                                      </h6>
                                      <div className="space-y-2 text-sm">
                                        {quotation.productDetails?.pixelPitch && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Pixel Pitch:</span>
                                            <span className="font-medium">{quotation.productDetails.pixelPitch}mm</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.category && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Category:</span>
                                            <span className="font-medium">{quotation.productDetails.category}</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.resolution && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Resolution:</span>
                                            <span className="font-medium">
                                              {quotation.productDetails.resolution.width}×{quotation.productDetails.resolution.height}px
                                            </span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.displaySize && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Display Size:</span>
                                            <span className="font-medium">
                                              {quotation.productDetails.displaySize.width}×{quotation.productDetails.displaySize.height}m
                                            </span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.aspectRatio && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Aspect Ratio:</span>
                                            <span className="font-medium">{quotation.productDetails.aspectRatio}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Technical Specifications */}
                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                      <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <Clock className="w-4 h-4 mr-2 text-green-600" />
                                        Technical Specs
                                      </h6>
                                      <div className="space-y-2 text-sm">
                                        {quotation.productDetails?.brightness && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Brightness:</span>
                                            <span className="font-medium">{quotation.productDetails.brightness}cd/m²</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.refreshRate && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Refresh Rate:</span>
                                            <span className="font-medium">{quotation.productDetails.refreshRate}Hz</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.environment && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Environment:</span>
                                            <span className="font-medium capitalize">{quotation.productDetails.environment}</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.maxPowerConsumption && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Max Power:</span>
                                            <span className="font-medium">{quotation.productDetails.maxPowerConsumption}W</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.avgPowerConsumption && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Avg Power:</span>
                                            <span className="font-medium">{quotation.productDetails.avgPowerConsumption}W</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Configuration and Pricing */}
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                    {/* Configuration */}
                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                      <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-purple-600" />
                                        Configuration
                                      </h6>
                                      <div className="space-y-2 text-sm">
                                        {quotation.productDetails?.cabinetGrid && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Cabinet Grid:</span>
                                            <span className="font-medium">
                                              {quotation.productDetails.cabinetGrid.columns}×{quotation.productDetails.cabinetGrid.rows}
                                            </span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.processor && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Processor:</span>
                                            <span className="font-medium">{quotation.productDetails.processor}</span>
                                          </div>
                                        )}
                                        {quotation.productDetails?.mode && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Mode:</span>
                                            <span className="font-medium">{quotation.productDetails.mode}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Pricing and Timeline */}
                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                      <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                        <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                                        Pricing & Timeline
                                      </h6>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">User Type:</span>
                                          <span className="font-medium">{customer.userTypeDisplayName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Total Price:</span>
                                          <div className="text-right">
                                            {(() => {

                                              const actualPrice = getQuotationDisplayTotal(quotation);
                                              const userTypeDisplayName = quotation.userTypeDisplayName || 'End User';

                                              return (
                                                <div>
                                                  <span className="font-semibold text-green-600 text-lg">
                                                    ₹{actualPrice.toLocaleString('en-IN')}
                                                  </span>
                                                  <div className="text-xs text-blue-600">
                                                    {userTypeDisplayName} Pricing
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    (Excl. GST - From DB)
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        {/* Display exact pricing breakdown if available */}
                                        {quotation.exactPricingBreakdown && (
                                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                              📊 Exact Pricing Breakdown (As Shown on Page):
                                            </div>
                                            <div className="space-y-1 text-xs">
                                              {(() => {
                                                const breakdown = quotation.exactPricingBreakdown;
                                                const displayedSubtotal = resolveDisplayedProductSubtotal(breakdown);
                                                const ledAmount = breakdown.discount?.discountType === 'led'
                                                  ? breakdown.discount.discountAmountPerUnit
                                                  : breakdown.discount?.ledOverride?.amountPerUnit;
                                                const displayedUnit = ledAmount && ledAmount > 0
                                                  ? ledAmount
                                                  : breakdown.unitPrice;
                                                const processorAmount = breakdown.processorTotal ?? breakdown.processorPrice ?? 0;
                                                const structureAmount = breakdown.structureTotal ?? breakdown.structureCost ?? 0;
                                                const installationAmount = breakdown.installationTotal ?? breakdown.installationCost ?? 0;
                                                const savedLines = normalizeQuotationLineItems(quotation);
                                                if (savedLines.length > 1) {
                                                  return <>
                                                    {savedLines.map((line, index) => (
                                                      <div key={line.id || index} className="border-b border-gray-200 pb-1">
                                                        <div className="flex justify-between font-medium">
                                                          <span>Product {index + 1}: {line.productName}</span>
                                                          <span>₹{Number(line.pricing?.grandTotal || 0).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="text-gray-500">
                                                          {line.cabinetGrid?.columns} × {line.cabinetGrid?.rows} cabinets · {line.cabinetGrid?.totalWidth} × {line.cabinetGrid?.totalHeight} mm
                                                          {line.orderQuantity > 1 ? ` · ${line.orderQuantity} units` : ''}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </>;
                                                }
                                                return (
                                                  <>
                                              <div className="flex justify-between">
                                                <span>Unit Price:</span>
                                                <span>₹{displayedUnit?.toLocaleString('en-IN')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Quantity:</span>
                                                <span>{breakdown.quantity}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Units:</span>
                                                <span>{(breakdown as any).orderQuantity
                                                  || (quotation.quotationData as any)?.orderQuantity
                                                  || 1}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span>₹{displayedSubtotal.toLocaleString('en-IN')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>GST</span>
                                                <span>18%</span>
                                              </div>
                                              {processorAmount > 0 && (
                                                <>
                                                  <div className="flex justify-between">
                                                    <span>Processor:</span>
                                                    <span>₹{processorAmount.toLocaleString('en-IN')}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span>Processor GST</span>
                                                    <span>18%</span>
                                                  </div>
                                                </>
                                              )}
                                              {structureAmount > 0 && (
                                                <div className="flex justify-between">
                                                  <span>Structure:</span>
                                                  <span>₹{structureAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                              )}
                                              {installationAmount > 0 && (
                                                <div className="flex justify-between">
                                                  <span>Installation:</span>
                                                  <span>₹{installationAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                              )}
                                                  </>
                                                );
                                              })()}
                                              {(() => {
                                                const savedAddons = readQuotationAddons(
                                                  (quotation.quotationData as any)?.customAddons,
                                                  (quotation.exactPricingBreakdown as any)?.customAddons
                                                );
                                                const savedAddonsTotal = sumQuotationAddons(savedAddons);
                                                if (!savedAddons.length) return null;
                                                return (
                                                  <div className="flex justify-between">
                                                    <span>Add-ons:</span>
                                                    <span>₹{savedAddonsTotal.toLocaleString('en-IN')}</span>
                                                  </div>
                                                );
                                              })()}
                                              <div className="flex justify-between font-semibold border-t pt-1">
                                                <span>Grand Total:</span>
                                                <span className="text-green-600">₹{getQuotationDisplayTotal(quotation).toLocaleString('en-IN')}</span>
                                              </div>

                                            </div>
                                          </div>
                                        )}

                                        {/* Super Admin Discount Controls */}
                                        {(() => {
                                          const hasPermission = loggedInUser?.role === 'super' || loggedInUser?.role === 'super_admin';

                                          return hasPermission;
                                        })() && (
                                            <div className="mt-4 pt-3 border-t border-gray-200">
                                              {editingDiscountQuotationId === quotation.quotationId ? (
                                                <div className="bg-blue-50 p-3 rounded-md animate-fadeIn">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Apply Discount</span>
                                                    <button
                                                      onClick={() => clearDiscountFormState()}
                                                      className="text-gray-400 hover:text-gray-600"
                                                    >
                                                      <X className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                  <div className="space-y-3">
                                                    {(() => {
                                                      const lineItems = normalizeQuotationLineItems(quotation);
                                                      const selectedItem = selectedDiscountLineItemId
                                                        ? lineItems.find(li => (li.id || '') === selectedDiscountLineItemId)
                                                        : (lineItems.length === 1 ? lineItems[0] : null);
                                                      if (!selectedItem && lineItems.length <= 1) return null;
                                                      if (!selectedItem) return null;
                                                      const productName = selectedItem.productName
                                                        || selectedItem.product?.name
                                                        || 'Product';
                                                      const currentTotal = selectedItem.pricing?.grandTotal
                                                        ?? selectedItem.discount?.discountedGrandTotal
                                                        ?? 0;
                                                      return (
                                                        <div className="rounded-md border border-blue-200 bg-white px-3 py-2">
                                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                                            Product {selectedDiscountProductIndex + 1}
                                                          </p>
                                                          <p className="text-xs font-semibold text-gray-900 mt-0.5">{productName}</p>
                                                          <p className="text-xs text-gray-600 mt-1">
                                                            Current Product Total: ₹{Math.round(Number(currentTotal) || 0).toLocaleString('en-IN')}
                                                          </p>
                                                          {lineItems.length > 1 && (
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setEditingDiscountQuotationId(null);
                                                                setDiscountSelectionQuotationId(quotation.quotationId);
                                                              }}
                                                              className="mt-2 text-[11px] font-medium text-blue-700 hover:text-blue-900 underline"
                                                            >
                                                              Change product
                                                            </button>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}

                                                    <div>
                                                      <label className="text-xs text-gray-600 block mb-1">Discount Type</label>
                                                      <select
                                                        value={discountType || ''}
                                                        onChange={(e) => setDiscountType(e.target.value as any || null)}
                                                        className="w-full text-xs border border-gray-300 rounded p-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                      >
                                                        <option value="">Select Type</option>
                                                        <option value="led">LED Screen Price</option>
                                                        <option value="controller">Controller Price</option>
                                                      </select>
                                                    </div>

                                                    {/* LED Discount — product-type-aware */}
                                                    {discountType === 'led' && (() => {
                                                      const lineItems = normalizeQuotationLineItems(quotation);
                                                      const selectedItem = selectedDiscountLineItemId
                                                        ? lineItems.find(li => (li.id || '') === selectedDiscountLineItemId)
                                                        : (lineItems.length === 1 ? lineItems[0] : null);
                                                      const product = selectedItem
                                                        ? resolveLineItemProduct(selectedItem)
                                                        : (quotation.productDetails?.product || quotation.productDetails);
                                                      const ledMode = getLedDiscountMode(product);
                                                      const cabinetGrid = selectedItem?.cabinetGrid
                                                        || quotation.exactProductSpecs?.cabinetGrid
                                                        || quotation.productDetails?.cabinetGrid;
                                                      let configForUnits = selectedItem?.config || quotation.quotationData?.config;
                                                      if (!configForUnits && quotation.exactProductSpecs?.displaySize) {
                                                        configForUnits = {
                                                          width: (quotation.exactProductSpecs.displaySize.width * 1000) || 0,
                                                          height: (quotation.exactProductSpecs.displaySize.height * 1000) || 0,
                                                          unit: 'mm'
                                                        };
                                                      }
                                                      if (!configForUnits && quotation.productDetails?.displaySize) {
                                                        configForUnits = {
                                                          width: (quotation.productDetails.displaySize.width * 1000) || 0,
                                                          height: (quotation.productDetails.displaySize.height * 1000) || 0,
                                                          unit: 'mm'
                                                        };
                                                      }
                                                      const units = getDiscountUnits(product, cabinetGrid, configForUnits);
                                                      const unitLabel = getDiscountUnitLabel(product);
                                                      const totalDiscount = Math.round((discountAmountPerUnit * units) * 100) / 100;

                                                      if (ledMode === 'none') {
                                                        return (
                                                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 font-medium">
                                                            ⚠️ No discount available for Jumbo / Digital Standee products.
                                                          </div>
                                                        );
                                                      }

                                                      return (
                                                        <div className="space-y-2">
                                                          <div>
                                                            <label className="text-xs text-gray-600 block mb-1">Override unit price (₹ {unitLabel})</label>
                                                            <div className="flex items-center space-x-2">
                                                              <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                value={discountAmountPerUnit || ''}
                                                                onChange={(e) => setDiscountAmountPerUnit(parseFloat(e.target.value) || 0)}
                                                                className="flex-1 text-xs border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                                placeholder={`₹ ${unitLabel}`}
                                                              />
                                                              <button
                                                                onClick={() => handleApplyDiscount(quotation)}
                                                                disabled={isUpdatingDiscount || !discountType || discountAmountPerUnit <= 0}
                                                                className="bg-blue-600 text-white min-w-[32px] h-[32px] flex items-center justify-center rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                                title="Apply Discount"
                                                              >
                                                                {isUpdatingDiscount ? (
                                                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                  <SaveIcon className="w-4 h-4" />
                                                                )}
                                                              </button>
                                                            </div>
                                                          </div>
                                                          <div className="p-2 bg-blue-100 rounded text-xs space-y-0.5">
                                                            <div className="flex justify-between">
                                                              <span>{ledMode === 'per_cabinet' ? 'Cabinets:' : 'Sq Ft:'}</span>
                                                              <span className="font-medium">{ledMode === 'per_cabinet' ? Math.round(units) : units}</span>
                                                            </div>
                                                            <div className="flex justify-between font-semibold text-blue-700">
                                                              <span>New LED subtotal:</span>
                                                              <span>₹{totalDiscount.toLocaleString('en-IN')}</span>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    })()}

                                                    {/* Controller Discount — override price */}
                                                    {discountType === 'controller' && (
                                                      <div>
                                                        <label className="text-xs text-gray-600 block mb-1">Override Price (₹)</label>
                                                        <div className="flex items-center space-x-2">
                                                          <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={discountAmountPerUnit || ''}
                                                            onChange={(e) => setDiscountAmountPerUnit(parseFloat(e.target.value) || 0)}
                                                            className="flex-1 text-xs border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                            placeholder="New price"
                                                          />
                                                          <button
                                                            onClick={() => handleApplyDiscount(quotation)}
                                                            disabled={isUpdatingDiscount || !discountType || discountAmountPerUnit <= 0}
                                                            className="bg-blue-600 text-white min-w-[32px] h-[32px] flex items-center justify-center rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                            title="Apply Discount"
                                                          >
                                                            {isUpdatingDiscount ? (
                                                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                              <SaveIcon className="w-4 h-4" />
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    )}

                                                    {(() => {
                                                      const lineItems = normalizeQuotationLineItems(quotation);
                                                      const selectedItem = selectedDiscountLineItemId
                                                        ? lineItems.find(li => (li.id || '') === selectedDiscountLineItemId)
                                                        : (lineItems.length === 1 ? lineItems[0] : null);
                                                      const hasLineDiscount = selectedItem
                                                        ? lineItemHasDiscount(selectedItem)
                                                        : !!(quotation.quotationData?.discountApplied
                                                          || ((quotation.exactPricingBreakdown?.discount?.discountAmount ?? 0) > 0));
                                                      if (!hasLineDiscount || lineItems.length <= 1) {
                                                        // For single-product, keep existing behavior (no remove button was present).
                                                        // For multi-product with an existing discount, show remove.
                                                        if (!(lineItems.length > 1 && hasLineDiscount)) return null;
                                                      }
                                                      if (!(lineItems.length > 1 && hasLineDiscount)) return null;
                                                      return (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleRemoveDiscountFromSelectedProduct(quotation)}
                                                          disabled={isUpdatingDiscount}
                                                          className="w-full text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md py-1.5 hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                          Remove Discount from Product {selectedDiscountProductIndex + 1}
                                                        </button>
                                                      );
                                                    })()}
                                                  </div>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => beginDiscountForQuotation(quotation)}
                                                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-md border border-indigo-200 transition-all shadow-sm text-xs font-semibold"
                                                >
                                                  <Percent className="w-3.5 h-3.5" />
                                                  {(() => {
                                                    const lineItems = normalizeQuotationLineItems(quotation);
                                                    const anyLineDiscount = lineItems.some(lineItemHasDiscount);
                                                    const legacyDiscount = quotation.quotationData?.discountApplied
                                                      || ((quotation.exactPricingBreakdown?.discount?.discountAmount ?? 0) > 0);
                                                    return (anyLineDiscount || legacyDiscount) ? 'Edit Discount' : 'Add Discount';
                                                  })()}
                                                </button>
                                              )}
                                            </div>
                                          )}

                                        {/* Display exact product specs if available */}
                                        {quotation.exactProductSpecs && (
                                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                              📋 Exact Product Specs (As Shown on Page):
                                            </div>
                                            <div className="space-y-1 text-xs">
                                              <div className="flex justify-between">
                                                <span>Product:</span>
                                                <span>{quotation.exactProductSpecs.productName}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Category:</span>
                                                <span>{quotation.exactProductSpecs.category}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Pixel Pitch:</span>
                                                <span>P{quotation.exactProductSpecs.pixelPitch}</span>
                                              </div>
                                              {quotation.exactProductSpecs.displaySize && (
                                                <div className="flex justify-between">
                                                  <span>Display Size:</span>
                                                  <span>{quotation.exactProductSpecs.displaySize.width}m × {quotation.exactProductSpecs.displaySize.height}m</span>
                                                </div>
                                              )}
                                              {quotation.exactProductSpecs.aspectRatio && (
                                                <div className="flex justify-between">
                                                  <span>Aspect Ratio:</span>
                                                  <span>{quotation.exactProductSpecs.aspectRatio}</span>
                                                </div>
                                              )}
                                              {quotation.exactProductSpecs.processor && (
                                                <div className="flex justify-between">
                                                  <span>Processor:</span>
                                                  <span>{quotation.exactProductSpecs.processor}</span>
                                                </div>
                                              )}
                                              {quotation.exactProductSpecs.cabinetGrid && (
                                                <div className="flex justify-between">
                                                  <span>Cabinet Grid:</span>
                                                  <span>{quotation.exactProductSpecs.cabinetGrid.columns}×{quotation.exactProductSpecs.cabinetGrid.rows}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Created:</span>
                                          <span className="font-medium">
                                            {new Date(quotation.createdAt).toLocaleDateString('en-IN', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit'
                                            })}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Time:</span>
                                          <span className="font-medium">
                                            {new Date(quotation.createdAt).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Message */}
                                  {quotation.message && (
                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                      <h6 className="font-semibold text-gray-900 mb-2 flex items-center">
                                        <MessageSquare className="w-4 h-4 mr-2 text-orange-600" />
                                        Additional Message
                                      </h6>
                                      <p className="text-gray-700 text-sm">{quotation.message}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Multi-product discount: select which product to discount */}
      {(() => {
        if (!discountSelectionQuotationId) return null;
        const quotation = customers
          .flatMap(c => c.quotations)
          .find(q => q.quotationId === discountSelectionQuotationId);
        if (!quotation) return null;
        const lineItems = normalizeQuotationLineItems(quotation);
        return (
          <QuotationProductSelectionModal
            isOpen={true}
            onClose={() => {
              setDiscountSelectionQuotationId(null);
            }}
            lineItems={lineItems}
            title="Select Product for Discount"
            subtitle="Which product would you like to apply the discount to?"
            actionLabel={(index) => `Apply Discount to Product ${index + 1}`}
            getProductTotal={(item) => {
              const li = item as PersistedQuotationLineItem;
              return li.pricing?.grandTotal
                ?? li.discount?.discountedGrandTotal
                ?? null;
            }}
            onSelectProduct={(item, index) => {
              openDiscountFormForLineItem(quotation, item as PersistedQuotationLineItem, index);
              setDiscountSelectionQuotationId(null);
            }}
          />
        );
      })()}

      {/* PDF View Modal */}
      {selectedQuotation && (() => {
        const customer = customers.find(c =>
          c.quotations.some(q => q.quotationId === selectedQuotation.quotationId)
        );
        const discountPdfFileName = `${selectedQuotation.quotationId.replace(/\//g, '_')}.pdf`;

        return (
        <PdfViewModal
          isOpen={isPdfModalOpen}
          onClose={() => {
            setIsPdfModalOpen(false);
            setSelectedQuotation(null);
            setPdfHtmlContent('');
          }}
          htmlContent={pdfHtmlContent}
          onDownload={async () => {
            if (!pdfHtmlContent) return;

            try {
              const { generatePdfFromHtml } = await import('../utils/docxGenerator');
              const blob = await generatePdfFromHtml(pdfHtmlContent);

              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = discountPdfFileName;
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (error) {
              alert('Failed to download PDF. Please try again.');
            }
          }}
          fileName={discountPdfFileName}
          selectedProduct={selectedQuotation.productDetails?.product || selectedQuotation.productDetails}
          config={
            selectedQuotation.quotationData?.config ||
            (selectedQuotation.exactProductSpecs?.displaySize ? {
              width: (selectedQuotation.exactProductSpecs.displaySize.width * 1000),
              height: (selectedQuotation.exactProductSpecs.displaySize.height * 1000),
              unit: 'mm'
            } : undefined)
          }
          cabinetGrid={
            selectedQuotation.exactProductSpecs?.cabinetGrid ||
            selectedQuotation.productDetails?.cabinetGrid ||
            selectedQuotation.quotationData?.cabinetGrid
          }
          processor={selectedQuotation.exactProductSpecs?.processor || selectedQuotation.productDetails?.processor || selectedQuotation.quotationData?.processor || null}
          mode={selectedQuotation.exactProductSpecs?.mode || selectedQuotation.quotationData?.mode}
          customPricing={selectedQuotation.quotationData?.customPricing}
          userInfo={{
            userType: customer?.userTypeDisplayName || selectedQuotation.userTypeDisplayName || 'End User',
            fullName: customer?.customerName || selectedQuotation.customerName || '',
            email: customer?.customerEmail || selectedQuotation.customerEmail || '',
            phoneNumber: customer?.customerPhone || selectedQuotation.customerPhone || '',
            projectTitle: selectedQuotation.quotationData?.userInfo?.projectTitle || selectedQuotation.projectTitle || '',
            address: selectedQuotation.quotationData?.userInfo?.address || selectedQuotation.address || ''
          }}
          salesUser={salesPerson ? {
            _id: salesPerson._id,
            name: salesPerson.name,
            email: salesPerson.email,
            role: salesPerson.role
          } : null}
          userRole="super"
          quotationId={selectedQuotation.quotationId}
          isEditing={true}
          clientId={selectedQuotation.clientId as string | undefined}
          exactPricingBreakdown={buildExactPricingBreakdownForPdf(selectedQuotation.exactPricingBreakdown)}
          savedQuotation={selectedQuotation}
          wireType={selectedQuotation.quotationData?.wireType}
          nexaAddons={selectedQuotation.quotationData?.nexaAddons || selectedQuotation.exactPricingBreakdown?.appliedAddons?.map((addon: any) => addon.name)}
        />
        );
      })()}
    </div>
  );
};
