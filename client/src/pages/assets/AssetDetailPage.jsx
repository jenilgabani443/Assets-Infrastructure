import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../utils/leafletConfig';
import {
  Boxes,
  ArrowLeft,
  Edit,
  Trash2,
  Printer,
  Wrench,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  RefreshCw,
  QrCode as QrIcon,
  Download,
  Activity,
  User,
  Tag,
  CheckCircle,
  Layers,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  LifecycleBadge,
  StatusBadge,
  Tabs,
  Spinner,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime
} from '../../utils';

import LifecycleStepper from './components/LifecycleStepper';
import ChangeStageModal from './components/ChangeStageModal';
import PrintLabelModal from './components/PrintLabelModal';
import ScheduleMaintenanceModal from './components/ScheduleMaintenanceModal';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [asset, setAsset] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [changeStageOpen, setChangeStageOpen] = useState(false);
  const [printLabelOpen, setPrintLabelOpen] = useState(false);
  const [scheduleMaintOpen, setScheduleMaintOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';

  // Fetch Asset & QR
  const fetchAssetDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [assetRes, qrRes] = await Promise.allSettled([
        api.get(`/assets/${id}`),
        api.get(`/assets/${id}/qr`)
      ]);

      if (assetRes.status === 'fulfilled' && assetRes.value.data?.success) {
        setAsset(assetRes.value.data.data);
      } else {
        throw new Error('Failed to load asset details');
      }

      if (qrRes.status === 'fulfilled' && qrRes.value.data?.success) {
        setQrData(qrRes.value.data.data);
      }
    } catch (err) {
      console.error('Fetch asset detail error:', err);
      toast.error(err.response?.data?.message || 'Could not load asset');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  // Fetch Timeline tab data
  const fetchTimeline = useCallback(async () => {
    try {
      setLoadingTimeline(true);
      const res = await api.get(`/assets/${id}/timeline`);
      if (res.data?.success) {
        setTimeline(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch timeline error:', err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [id]);

  // Fetch Maintenance logs tab data
  const fetchMaintenance = useCallback(async () => {
    try {
      setLoadingMaintenance(true);
      const res = await api.get(`/maintenance?asset=${id}&limit=50`);
      if (res.data?.success) {
        const list = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.logs || [];
        setMaintenanceLogs(list);
      }
    } catch (err) {
      console.error('Fetch maintenance error:', err);
    } finally {
      setLoadingMaintenance(false);
    }
  }, [id]);

  // Fetch Audit logs tab data
  const fetchAudit = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const res = await api.get(`/assets/${id}/audit`);
      if (res.data?.success) {
        setAuditLogs(res.data.data || []);
      }
    } catch (err) {
      console.error('Fetch audit error:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAssetDetails();
  }, [fetchAssetDetails]);

  // Lazy fetch tab data when switched
  useEffect(() => {
    if (activeTab === 'timeline') fetchTimeline();
    if (activeTab === 'maintenance') fetchMaintenance();
    if (activeTab === 'audit') fetchAudit();
  }, [activeTab, fetchTimeline, fetchMaintenance, fetchAudit]);

  // Delete Asset handler
  const handleDeleteAsset = async () => {
    try {
      setDeleting(true);
      const res = await api.delete(`/assets/${id}`);
      if (res.data?.success) {
        toast.success('Asset deleted successfully');
        navigate('/assets');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete asset');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Lifespan & Age Calculations
  const lifespanMetrics = useMemo(() => {
    if (!asset) return null;
    const startDate = asset.installationDate || asset.purchaseDate;
    const lifespanYears = asset.expectedLifespanYears;

    if (!startDate || !lifespanYears) return null;

    const startMs = new Date(startDate).getTime();
    const nowMs = Date.now();
    const ageMs = Math.max(0, nowMs - startMs);
    const lifespanMs = lifespanYears * 365.25 * 24 * 3600 * 1000;
    const ratio = Math.min(2.0, ageMs / lifespanMs);
    const percent = Math.round(ratio * 100);
    const ageYears = (ageMs / (365.25 * 24 * 3600 * 1000)).toFixed(1);

    const isPast = ratio >= 1.0;
    const isWarning = ratio >= 0.8 && ratio < 1.0;

    let barColor = 'bg-emerald-500';
    if (isPast) barColor = 'bg-rose-500';
    else if (isWarning) barColor = 'bg-amber-500';

    return {
      ageYears,
      lifespanYears,
      percent,
      isPast,
      isWarning,
      barColor
    };
  }, [asset]);

  // Warranty Status
  const warrantyStatus = useMemo(() => {
    if (!asset?.warrantyExpiry) return null;
    const expiry = new Date(asset.warrantyExpiry);
    const now = new Date();
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Expired ${Math.abs(diffDays)}d ago`,
        variant: 'danger',
        isExpiring: false,
        isExpired: true
      };
    }
    if (diffDays <= 30) {
      return {
        label: `Expires in ${diffDays}d`,
        variant: 'warning',
        isExpiring: true,
        isExpired: false
      };
    }
    return {
      label: `Active until ${formatDate(expiry)}`,
      variant: 'success',
      isExpiring: false,
      isExpired: false
    };
  }, [asset?.warrantyExpiry]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Spinner size="lg" text="Loading asset specifications & telemetry..." />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="py-16 text-center">
        <EmptyState
          icon={Boxes}
          title="Asset Not Found"
          description="The requested infrastructure asset could not be located or has been deleted."
          action={
            <Link to="/assets">
              <Button variant="outline" icon={ArrowLeft}>
                Back to Assets
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const mapPosition =
    asset.location?.lat && asset.location?.lng
      ? [asset.location.lat, asset.location.lng]
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/assets"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Assets</span>
            </Link>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200">
              {asset.assetTag}
            </span>
            <LifecycleBadge stage={asset.lifecycleStage} />
            <StatusBadge status={asset.status} />
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {asset.name}
          </h2>

          <p className="text-xs text-slate-500">
            {asset.category?.name || 'General Category'}
            {asset.subcategory && ` • ${asset.subcategory}`}
            {asset.department && ` • ${asset.department}`}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => setPrintLabelOpen(true)}
          >
            Print Label
          </Button>

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              icon={Wrench}
              onClick={() => setScheduleMaintOpen(true)}
            >
              Schedule Upkeep
            </Button>
          )}

          {canManage && (
            <Link to={`/assets/${asset._id}/edit`}>
              <Button variant="outline" size="sm" icon={Edit}>
                Edit
              </Button>
            </Link>
          )}

          {isAdmin && (
            <Button
              variant="dangerOutline"
              size="sm"
              icon={Trash2}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* 2. LIFECYCLE STEPPER CARD */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Operational Lifecycle Stage
            </h3>
            <p className="text-xs text-slate-500">
              Current milestone:{' '}
              <strong className="text-primary-700 font-semibold">
                {asset.lifecycleStage}
              </strong>
            </p>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={RefreshCw}
              onClick={() => setChangeStageOpen(true)}
            >
              Change Stage
            </Button>
          )}
        </div>

        <LifecycleStepper currentStage={asset.lifecycleStage} />
      </Card>

      {/* 3. MAIN DETAIL TABS */}
      <div className="space-y-4">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            {
              id: 'timeline',
              label: 'Timeline',
              count: timeline.length > 0 ? timeline.length : undefined
            },
            {
              id: 'maintenance',
              label: 'Maintenance',
              count: maintenanceLogs.length > 0 ? maintenanceLogs.length : undefined
            },
            {
              id: 'audit',
              label: 'Audit History',
              count: auditLogs.length > 0 ? auditLogs.length : undefined
            }
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Core Specs, Dynamic Fields, Lifespan */}
            <div className="lg:col-span-2 space-y-6">
              {/* Core Information Card */}
              <Card title="Core Specifications">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Category</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {asset.category?.name || 'Uncategorized'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Subcategory</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {asset.subcategory || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Department</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {asset.department || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Cost / Value</span>
                    <span className="text-slate-900 font-bold mt-0.5 block">
                      {formatCurrency(asset.cost || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Installation Date</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {formatDate(asset.installationDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Purchase Date</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {formatDate(asset.purchaseDate)}
                    </span>
                  </div>
                </div>

                {/* Warranty Status Banner */}
                {asset.warrantyExpiry && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                      <span>Warranty Expiry: {formatDate(asset.warrantyExpiry)}</span>
                    </span>
                    {warrantyStatus && (
                      <Badge variant={warrantyStatus.variant} size="sm">
                        {warrantyStatus.label}
                      </Badge>
                    )}
                  </div>
                )}
              </Card>

              {/* Engineered Lifespan Progress Bar */}
              {lifespanMetrics && (
                <Card title="Lifespan & Health Telemetry">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {lifespanMetrics.ageYears} of {lifespanMetrics.lifespanYears} years expected
                      </span>
                      <span
                        className={`font-bold ${
                          lifespanMetrics.isPast ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {lifespanMetrics.percent}% of lifespan used
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${lifespanMetrics.barColor}`}
                        style={{ width: `${Math.min(100, lifespanMetrics.percent)}%` }}
                      />
                    </div>

                    {lifespanMetrics.isPast && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>
                          <strong>Engineered lifespan exceeded:</strong> Asset has operated past its
                          recommended lifespan. Schedule full diagnostic inspection or replacement.
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Dynamic Technical Custom Fields */}
              <Card title="Technical Specifications">
                {asset.category?.fieldDefinitions &&
                asset.category.fieldDefinitions.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    {asset.category.fieldDefinitions.map((field) => {
                      const val = asset.customFields?.[field.name];
                      return (
                        <div key={field.name} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-slate-500 block text-[11px] font-medium">
                            {field.label || field.name}
                          </span>
                          <span className="text-slate-900 font-bold mt-0.5 block truncate">
                            {val !== undefined && val !== null && val !== '' ? (
                              typeof val === 'boolean' ? (
                                val ? 'Yes' : 'No'
                              ) : (
                                `${val} ${field.unit || ''}`
                              )
                            ) : (
                              <span className="text-slate-400 font-normal italic">Not specified</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No custom technical schema defined for this category.
                  </p>
                )}
              </Card>

              {/* Location & GIS Map */}
              <Card title="Physical Location & Coordinates">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-xs text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {asset.location?.address || 'Street address not recorded'}
                      </p>
                      {mapPosition && (
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          GPS: {mapPosition[0].toFixed(5)}, {mapPosition[1].toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>

                  {mapPosition ? (
                    <div className="h-56 w-full rounded-2xl overflow-hidden border border-slate-200 relative z-10">
                      <MapContainer
                        center={mapPosition}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={mapPosition}>
                          <Popup>
                            <div className="text-xs">
                              <strong>{asset.name}</strong>
                              <p className="text-slate-500">{asset.assetTag}</p>
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                      No GPS coordinates mapped for this asset.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Photo & QR Widget */}
            <div className="space-y-6">
              {/* Asset Photo Card */}
              <Card title="Visual Media">
                {asset.imageUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 aspect-video sm:aspect-square flex items-center justify-center">
                    <img
                      src={asset.imageUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No photograph cataloged</p>
                    {canManage && (
                      <Link to={`/assets/${asset._id}/edit`}>
                        <Button variant="link" size="sm" className="mt-2">
                          Upload Photo
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </Card>

              {/* QR Code Tag Card */}
              <Card title="Quick-Response Code">
                <div className="text-center space-y-3">
                  {qrData?.qrCode ? (
                    <div className="inline-block p-2 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                      <img
                        src={qrData.qrCode}
                        alt={`QR Code for ${asset.assetTag}`}
                        className="w-36 h-36 mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                      <QrIcon className="w-8 h-8" />
                    </div>
                  )}

                  <div className="text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-800 block">
                      {asset.assetTag}
                    </span>
                    <span>Scans to direct asset telemetry</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Download}
                      onClick={() => {
                        if (!qrData?.qrCode) return;
                        const link = document.createElement('a');
                        link.href = qrData.qrCode;
                        link.download = `QR-${asset.assetTag}.png`;
                        link.click();
                      }}
                    >
                      Download
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Printer}
                      onClick={() => setPrintLabelOpen(true)}
                    >
                      Print Label
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: TIMELINE */}
        {activeTab === 'timeline' && (
          <Card title="Merged History & Operational Timeline">
            {loadingTimeline ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" text="Loading asset chronicle..." />
              </div>
            ) : timeline.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No timeline events recorded"
                description="Lifecycle stage transitions and maintenance work orders will automatically appear here."
              />
            ) : (
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((item) => {
                  const isLifecycle = item.kind === 'lifecycle';
                  return (
                    <div key={item._id} className="relative group">
                      {/* Timeline Dot Icon */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${
                          isLifecycle
                            ? 'bg-primary-600 text-white shadow-xs'
                            : 'bg-amber-500 text-white shadow-xs'
                        }`}
                      >
                        {isLifecycle ? (
                          <Layers className="w-3.5 h-3.5" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {/* Content Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {item.title}
                            </span>
                            <Badge
                              variant={isLifecycle ? 'primary' : 'warning'}
                              size="sm"
                            >
                              {item.kind}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDateTime(item.date)}
                          </span>
                        </div>

                        {/* Lifecycle specific info */}
                        {isLifecycle && item.remarks && (
                          <p className="text-xs text-slate-600 mt-1 italic bg-white p-2 rounded-lg border border-slate-100">
                            "{item.remarks}"
                          </p>
                        )}

                        {/* Maintenance specific info */}
                        {!isLifecycle && (
                          <div className="space-y-1 text-xs text-slate-600 mt-1">
                            <p>
                              Status: <strong className="capitalize">{item.status}</strong>
                              {item.cost ? ` • Cost: ${formatCurrency(item.cost)}` : ''}
                            </p>
                            {item.notes && <p className="text-slate-500">{item.notes}</p>}
                          </div>
                        )}

                        {/* User / Actor */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Logged by: {item.user?.name || item.technician?.name || 'System Operator'}
                          </span>
                          <span>{formatRelativeTime(item.date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* TAB 3: MAINTENANCE */}
        {activeTab === 'maintenance' && (
          <Card
            title="Maintenance Work Orders"
            headerAction={
              canManage && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Wrench}
                  onClick={() => setScheduleMaintOpen(true)}
                >
                  Schedule Task
                </Button>
              )
            }
          >
            {loadingMaintenance ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" text="Loading maintenance work orders..." />
              </div>
            ) : maintenanceLogs.length === 0 ? (
              <EmptyState
                icon={Wrench}
                title="No maintenance records"
                description="No preventative or corrective maintenance tasks scheduled for this asset."
                action={
                  canManage && (
                    <Button
                      variant="primary"
                      icon={Wrench}
                      onClick={() => setScheduleMaintOpen(true)}
                    >
                      Schedule First Task
                    </Button>
                  )
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Title</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Scheduled</th>
                      <th className="py-3 px-3">Completed</th>
                      <th className="py-3 px-3">Technician</th>
                      <th className="py-3 px-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {maintenanceLogs.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {m.title}
                        </td>
                        <td className="py-3 px-3 capitalize text-slate-600">{m.type}</td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              m.status === 'completed'
                                ? 'success'
                                : m.status === 'overdue'
                                ? 'danger'
                                : m.status === 'in_progress'
                                ? 'warning'
                                : 'default'
                            }
                            size="sm"
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{formatDate(m.scheduledDate)}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {m.completedDate ? formatDate(m.completedDate) : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {m.technician?.name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(m.cost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* TAB 4: AUDIT HISTORY */}
        {activeTab === 'audit' && (
          <Card title="System Audit Log Trail">
            {loadingAudit ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" text="Fetching compliance audit logs..." />
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No audit records"
                description="Asset creation, updates, and transitions will be cryptographically audited here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Summary</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono uppercase font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200 text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-800 max-w-sm">
                          {log.summary || log.description || 'System state mutation'}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {log.user?.name || 'System Operator'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.timestamp || log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Change Stage Modal */}
      <ChangeStageModal
        isOpen={changeStageOpen}
        onClose={() => setChangeStageOpen(false)}
        asset={asset}
        onSuccess={(updated) => {
          setAsset(updated);
          fetchTimeline();
        }}
      />

      {/* 2. Print Label Modal */}
      <PrintLabelModal
        isOpen={printLabelOpen}
        onClose={() => setPrintLabelOpen(false)}
        asset={asset}
        qrCodeUrl={qrData?.qrCode}
      />

      {/* 3. Schedule Maintenance Modal */}
      <ScheduleMaintenanceModal
        isOpen={scheduleMaintOpen}
        onClose={() => setScheduleMaintOpen(false)}
        asset={asset}
        onSuccess={() => {
          fetchMaintenance();
          fetchTimeline();
        }}
      />

      {/* 4. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAsset}
        title="Delete Asset"
        message={`Are you sure you want to permanently delete "${asset.name}" (${asset.assetTag})? This action cannot be undone.`}
        confirmText="Delete Asset"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
