import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RefreshCw,
  MapPin,
  Calendar,
  AlertTriangle,
  Building,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  PageHeader,
  Button,
  Card,
  Input,
  Select,
  Checkbox,
  Badge,
  LifecycleBadge,
  StatusBadge,
  Pagination,
  Spinner,
  EmptyState
} from '../../components/ui';
import {
  formatCurrency,
  formatDate,
  LIFECYCLE_STAGES
} from '../../utils';
import CsvImportModal from './components/CsvImportModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'operational', label: 'Operational' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'failed', label: 'Failed' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
  { value: 'reserved', label: 'Reserved' }
];

export default function AssetsListPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Categories list for filtering
  const [categories, setCategories] = useState([]);

  // Asset list data & pagination
  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalAssets: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // CSV Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Read initial filter values from URL searchParams
  const searchParamVal = searchParams.get('search') || '';
  const categoryParamVal = searchParams.get('category') || '';
  const stageParamVal = searchParams.get('lifecycleStage') || '';
  const statusParamVal = searchParams.get('status') || '';
  const departmentParamVal = searchParams.get('department') || '';
  const endOfLifeParamVal = searchParams.get('endOfLife') === 'true';
  const warrantyExpiringParamVal = searchParams.get('warrantyExpiring') === 'true';
  const sortParamVal = searchParams.get('sort') || '-createdAt';
  const pageParamVal = parseInt(searchParams.get('page') || '1', 10);

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(searchParamVal);

  // Fetch Categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data?.success && res.data?.data) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Update URL search parameters
  const updateQueryParam = useCallback(
    (newParams) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(newParams).forEach(([key, val]) => {
          if (val === null || val === undefined || val === '' || val === false) {
            next.delete(key);
          } else {
            next.set(key, String(val));
          }
        });
        // Reset to page 1 whenever any filter besides page changes
        if (!('page' in newParams)) {
          next.delete('page');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // Debounce search input into query param
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParamVal) {
        updateQueryParam({ search: searchInput });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, searchParamVal, updateQueryParam]);

  // Keep searchInput in sync if URL changes externally
  useEffect(() => {
    setSearchInput(searchParamVal);
  }, [searchParamVal]);

  // Fetch assets list based on query parameters
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pageParamVal,
        limit: 10,
        sort: sortParamVal
      };

      if (searchParamVal) params.search = searchParamVal;
      if (categoryParamVal) params.category = categoryParamVal;
      if (stageParamVal) params.lifecycleStage = stageParamVal;
      if (statusParamVal) params.status = statusParamVal;
      if (departmentParamVal) params.department = departmentParamVal;
      if (endOfLifeParamVal) params.endOfLife = true;
      if (warrantyExpiringParamVal) params.warrantyExpiringInDays = 30;

      const res = await api.get('/assets', { params });

      if (res.data?.success) {
        const assetList = Array.isArray(res.data.data)
          ? res.data.data
          : (res.data.data?.assets || []);
        setAssets(assetList);

        setPagination({
          currentPage: res.data.page || res.data.data?.pagination?.currentPage || 1,
          totalPages: res.data.pages || res.data.data?.pagination?.totalPages || 1,
          totalAssets:
            res.data.total !== undefined
              ? res.data.total
              : (res.data.data?.pagination?.totalAssets || assetList.length),
          limit: res.data.limit || res.data.data?.pagination?.limit || 10
        });
      } else {
        throw new Error(res.data?.message || 'Failed to load assets');
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError(err.response?.data?.message || 'Failed to load assets from inventory');
    } finally {
      setLoading(false);
    }
  }, [
    pageParamVal,
    sortParamVal,
    searchParamVal,
    categoryParamVal,
    stageParamVal,
    statusParamVal,
    departmentParamVal,
    endOfLifeParamVal,
    warrantyExpiringParamVal
  ]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle Sort column click
  const handleSort = (field) => {
    let nextSort = field;
    if (sortParamVal === field) {
      nextSort = `-${field}`;
    } else if (sortParamVal === `-${field}`) {
      nextSort = 'createdAt'; // Default reset
    }
    updateQueryParam({ sort: nextSort });
  };

  // Helper for sort indicator icon
  const getSortIcon = (field) => {
    if (sortParamVal === field) {
      return <ArrowUp className="w-3.5 h-3.5 text-primary-600 inline ml-1" />;
    }
    if (sortParamVal === `-${field}`) {
      return <ArrowDown className="w-3.5 h-3.5 text-primary-600 inline ml-1" />;
    }
    return <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1 group-hover:text-slate-500" />;
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = {};
      if (searchParamVal) params.search = searchParamVal;
      if (categoryParamVal) params.category = categoryParamVal;
      if (stageParamVal) params.lifecycleStage = stageParamVal;
      if (statusParamVal) params.status = statusParamVal;
      if (departmentParamVal) params.department = departmentParamVal;
      if (endOfLifeParamVal) params.endOfLife = true;
      if (warrantyExpiringParamVal) params.warrantyExpiringInDays = 30;

      const res = await api.get('/assets/export/csv', {
        params,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assets-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Asset inventory exported to CSV');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    searchParamVal ||
      categoryParamVal ||
      stageParamVal ||
      statusParamVal ||
      departmentParamVal ||
      endOfLifeParamVal ||
      warrantyExpiringParamVal
  );

  const canManage = role === 'admin' || role === 'manager';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Asset Inventory"
        subtitle="Comprehensive registry of municipal and enterprise infrastructure assets with real-time lifecycle tracking."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              icon={Download}
              loading={exporting}
              onClick={handleExportCsv}
              size="sm"
            >
              Export CSV
            </Button>

            {canManage && (
              <Button
                variant="outline"
                icon={Upload}
                onClick={() => setImportModalOpen(true)}
                size="sm"
              >
                Import CSV
              </Button>
            )}

            {canManage && (
              <Link to="/assets/new">
                <Button variant="primary" icon={Plus} size="sm">
                  Add Asset
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          {/* Top Search & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Search by tag, name, or subcategory..."
                icon={Search}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Select */}
            <Select
              value={categoryParamVal}
              onChange={(e) => updateQueryParam({ category: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {/* Lifecycle Stage Select */}
            <Select
              value={stageParamVal}
              onChange={(e) => updateQueryParam({ lifecycleStage: e.target.value })}
            >
              <option value="">All Lifecycle Stages</option>
              {LIFECYCLE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </Select>

            {/* Operational Status Select */}
            <Select
              value={statusParamVal}
              onChange={(e) => updateQueryParam({ status: e.target.value })}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Quick Checkbox Filters & Clear Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-5">
              <Checkbox
                label="End of Life Only"
                checked={endOfLifeParamVal}
                onChange={(e) => updateQueryParam({ endOfLife: e.target.checked })}
              />

              <Checkbox
                label="Warranties Expiring (30 Days)"
                checked={warrantyExpiringParamVal}
                onChange={(e) => updateQueryParam({ warrantyExpiring: e.target.checked })}
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAssets}>
            Retry
          </Button>
        </div>
      )}

      {/* ASSETS DATA DISPLAY */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" text="Fetching asset registry..." />
        </div>
      ) : assets.length === 0 ? (
        <Card className="py-16">
          <EmptyState
            icon={Boxes}
            title={hasActiveFilters ? 'No matching assets found' : 'No assets in inventory'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters, search term, or clearing search criteria.'
                : 'Get started by creating your first infrastructure asset or importing via CSV.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : canManage ? (
                <Link to="/assets/new">
                  <Button variant="primary" icon={Plus}>
                    Create Asset
                  </Button>
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* DESKTOP / TABLET RESPONSIVE TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Photo</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 group select-none"
                      onClick={() => handleSort('assetTag')}
                    >
                      Tag {getSortIcon('assetTag')}
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 group select-none"
                      onClick={() => handleSort('name')}
                    >
                      Asset Name {getSortIcon('name')}
                    </th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Subcategory</th>
                    <th className="py-3 px-4">Lifecycle Stage</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Location</th>
                    <th
                      className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 group select-none"
                      onClick={() => handleSort('cost')}
                    >
                      Cost {getSortIcon('cost')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {assets.map((asset) => (
                    <tr
                      key={asset._id}
                      onClick={() => navigate(`/assets/${asset._id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Photo Thumbnail */}
                      <td className="py-3 px-4 text-center">
                        {asset.imageUrl ? (
                          <img
                            src={asset.imageUrl}
                            alt={asset.name}
                            className="w-9 h-9 rounded-lg object-cover mx-auto border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Asset Tag */}
                      <td className="py-3 px-4 font-mono font-semibold text-primary-700 whitespace-nowrap">
                        {asset.assetTag}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-[200px] truncate group-hover:text-primary-600">
                        {asset.name}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {asset.category?.name || 'Uncategorized'}
                      </td>

                      {/* Subcategory */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {asset.subcategory || '—'}
                      </td>

                      {/* Lifecycle Stage Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <LifecycleBadge stage={asset.lifecycleStage} />
                      </td>

                      {/* Operational Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={asset.status} />
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {asset.department || '—'}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate">
                        {asset.location?.address ||
                          (asset.location?.lat
                            ? `${asset.location.lat.toFixed(3)}, ${asset.location.lng.toFixed(3)}`
                            : '—')}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right font-medium text-slate-800 whitespace-nowrap">
                        {formatCurrency(asset.cost || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (md:hidden) */}
          <div className="md:hidden space-y-3">
            {assets.map((asset) => (
              <div
                key={asset._id}
                onClick={() => navigate(`/assets/${asset._id}`)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-primary-300 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt={asset.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Boxes className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <span className="font-mono text-xs font-bold text-primary-700 block">
                        {asset.assetTag}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {asset.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {asset.category?.name || 'General'}
                        {asset.subcategory && ` • ${asset.subcategory}`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <LifecycleBadge stage={asset.lifecycleStage} />
                  <StatusBadge status={asset.status} />
                  {asset.department && (
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {asset.department}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                  <span className="truncate max-w-[200px]">
                    {asset.location?.address || 'Location not set'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(asset.cost || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION BAR */}
          {pagination.totalPages > 1 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalCount={pagination.totalAssets}
                limit={pagination.limit}
                onPageChange={(p) => updateQueryParam({ page: p })}
              />
            </div>
          )}
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={() => fetchAssets()}
        categories={categories}
      />
    </div>
  );
}
