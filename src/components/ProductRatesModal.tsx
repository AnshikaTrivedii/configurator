import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, IndianRupee, ArrowUpDown } from 'lucide-react';
import {
  buildProductRateRows,
  getRateSheetSeries,
  ProductRateRow
} from '../utils/productRates';

interface ProductRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortKey = 'series' | 'name' | 'endUserPrice';

const formatCurrency = (amount: number | null) => {
  if (amount === null || Number.isNaN(amount)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const ProductRatesModal: React.FC<ProductRatesModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('series');

  const allRows = useMemo(() => buildProductRateRows(), []);
  const seriesOptions = useMemo(() => getRateSheetSeries(allRows), [allRows]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedSeries('All');
      setSortKey('series');
    }
  }, [isOpen]);

  const groupedRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = allRows.filter((row) => {
      if (selectedSeries !== 'All' && row.series !== selectedSeries) return false;
      if (!query) return true;
      return (
        row.productName.toLowerCase().includes(query) ||
        row.series.toLowerCase().includes(query) ||
        row.variant.toLowerCase().includes(query) ||
        row.priceUnit.toLowerCase().includes(query)
      );
    });

    const compareRows = (a: ProductRateRow, b: ProductRateRow) => {
      if (sortKey === 'name') {
        return a.productName.localeCompare(b.productName) || a.variant.localeCompare(b.variant);
      }
      if (sortKey === 'endUserPrice') {
        const aPrice = a.endUserPrice ?? Number.POSITIVE_INFINITY;
        const bPrice = b.endUserPrice ?? Number.POSITIVE_INFINITY;
        if (aPrice !== bPrice) return aPrice - bPrice;
        return a.productName.localeCompare(b.productName);
      }
      return a.productName.localeCompare(b.productName) || a.variant.localeCompare(b.variant);
    };

    const seriesOrder = selectedSeries === 'All' ? seriesOptions : [selectedSeries];
    return seriesOrder
      .map((series) => ({
        series,
        rows: filtered.filter((row) => row.series === series).sort(compareRows)
      }))
      .filter((group) => group.rows.length > 0);
  }, [allRows, searchQuery, selectedSeries, seriesOptions, sortKey]);

  const visibleCount = groupedRows.reduce((sum, group) => sum + group.rows.length, 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-rates-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <IndianRupee size={18} className="text-blue-200" />
              </div>
              <h2 id="product-rates-title" className="text-lg sm:text-xl font-bold tracking-tight">
                Product Rate Sheet
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-300">
              Base catalog unit prices used by quotations. Read-only — excludes discounts and admin overrides.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close rate sheet"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search product, series, or variant"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedSeries}
                onChange={(event) => setSelectedSeries(event.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by series"
              >
                <option value="All">All series</option>
                {seriesOptions.map((series) => (
                  <option key={series} value={series}>
                    {series}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <ArrowUpDown size={14} className="text-gray-400" />
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="bg-transparent focus:outline-none"
                  aria-label="Sort rates"
                >
                  <option value="series">Sort by product</option>
                  <option value="name">Sort by name</option>
                  <option value="endUserPrice">Sort by end user price</option>
                </select>
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Showing {visibleCount} rate{visibleCount === 1 ? '' : 's'}
            {selectedSeries !== 'All' ? ` in ${selectedSeries}` : ''}
          </p>
        </div>

        <div className="flex-1 overflow-auto">
          {groupedRows.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-gray-900 font-medium">No matching products</p>
                <p className="text-sm text-gray-500 mt-1">Try a different search or series filter.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-100">
                {groupedRows.map((group) => (
                  <div key={group.series}>
                    <div className="sticky top-0 z-10 bg-slate-800 text-white px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
                      {group.series}
                      <span className="ml-2 font-normal text-slate-300 normal-case">
                        {group.rows.length} {group.rows.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    {group.rows.map((row) => (
                      <div key={row.id} className="px-4 py-3 bg-white">
                        <p className="font-medium text-gray-900">{row.productName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {row.series} · {row.variant} · {row.priceUnit}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">End User</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(row.endUserPrice)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">SI / Channel</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(row.siChannelPrice)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Reseller</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(row.resellerPrice)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Low Cost Model Price</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(row.competitivePrice)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Product</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Series</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Variant / Pitch</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap">Unit</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap text-right">End User</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap text-right">SI / Channel</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap text-right">Reseller</th>
                      <th className="px-4 sm:px-6 py-3 whitespace-nowrap text-right">Low Cost Model Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRows.map((group) => (
                      <React.Fragment key={group.series}>
                        <tr className="bg-slate-800 text-white">
                          <td colSpan={8} className="px-4 sm:px-6 py-2.5 text-xs font-semibold tracking-wide uppercase">
                            {group.series}
                            <span className="ml-2 font-normal text-slate-300 normal-case">
                              {group.rows.length} {group.rows.length === 1 ? 'item' : 'items'}
                            </span>
                          </td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50/40">
                            <td className="px-4 sm:px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {row.productName}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-gray-600 whitespace-nowrap">{row.series}</td>
                            <td className="px-4 sm:px-6 py-3 text-gray-700 min-w-[12rem]">{row.variant}</td>
                            <td className="px-4 sm:px-6 py-3 text-gray-500 whitespace-nowrap">{row.priceUnit}</td>
                            <td className="px-4 sm:px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                              {formatCurrency(row.endUserPrice)}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right text-gray-800 whitespace-nowrap">
                              {formatCurrency(row.siChannelPrice)}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right text-gray-800 whitespace-nowrap">
                              {formatCurrency(row.resellerPrice)}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right text-gray-800 whitespace-nowrap">
                              {formatCurrency(row.competitivePrice)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
