import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Wrench,
  Calendar as CalendarIcon,
  List,
  Plus,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
  X,
  Edit,
  Trash2,
  Boxes,
  DollarSign,
  Info
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
  Pagination,
  Spinner,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import {
  formatCurrency,
  formatDate,
  formatDateTime
} from '../../utils';

import CompleteMaintenanceModal from './components/CompleteMaintenanceModal';
import EditMaintenanceModal from './components/EditMaintenanceModal';
import CreateWorkOrderModal from './components/CreateWorkOrderModal';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'inspection', label: 'Inspection' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' }
];

export default function MaintenanceListPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // View Mode: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState('list');

  // Logs data and pagination
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);

  // Technicians list for filter dropdown and modals
  const [technicians, setTechnicians] = useState([]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeLog, setActiveLog] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayTasks, setSelectedDayTasks] = useState(null);
  const [selectedDayStr, setSelectedDayStr] = useState(null);

  // Read URL query params
  const statusParam = searchParams.get('status') || '';
  const typeParam = searchParams.get('type') || '';
  const techParam = searchParams.get('technician') || '';
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const overdueParam = searchParams.get('overdue') === 'true';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const canManage = role === 'admin' || role === 'manager';
  const isTechnician = role === 'technician';

  // Fetch Technicians once if Admin or Manager
  useEffect(() => {
    if (canManage) {
      const fetchTechs = async () => {
        try {
          const res = await api.get('/users?role=technician&limit=50');
          if (res.data?.success) {
            const list = Array.isArray(res.data.data) ? res.data.data : res.data.data?.users || [];
            setTechnicians(list);
          }
        } catch (err) {
          console.warn('Failed to load technicians:', err);
        }
      };
      fetchTechs();
    }
  }, [canManage]);

  // Update query params helper
  const updateQueryParam = useCallback(
    (newParams) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(newParams).forEach(([k, v]) => {
          if (v === null || v === undefined || v === '' || v === false) {
            next.delete(k);
          } else {
            next.set(k, String(v));
          }
        });
        if (!('page' in newParams)) {
          next.delete('page');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // Fetch maintenance logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pageParam,
        limit: viewMode === 'calendar' ? 100 : 10,
        sort: '-scheduledDate'
      };

      if (statusParam) params.status = statusParam;
      if (typeParam) params.type = typeParam;
      if (techParam && canManage) params.technician = techParam;
      if (fromParam) params.from = fromParam;
      if (toParam) params.to = toParam;
      if (overdueParam) params.overdue = true;

      const res = await api.get('/maintenance', { params });

      if (res.data?.success) {
        const list = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.logs || [];
        setLogs(list);

        setPagination({
          currentPage: res.data.page || 1,
          totalPages: res.data.pages || 1,
          totalLogs: res.data.total !== undefined ? res.data.total : list.length,
          limit: 10
        });
      }
    } catch (err) {
      console.error('Fetch maintenance logs error:', err);
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  }, [
    pageParam,
    viewMode,
    statusParam,
    typeParam,
    techParam,
    fromParam,
    toParam,
    overdueParam,
    canManage,
    toast
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Start Maintenance
  const handleStartTask = async (log) => {
    try {
      setActionLoading(true);
      const res = await api.patch(`/maintenance/${log._id}/start`);
      if (res.data?.success) {
        toast.success(
          res.data.data?.assetStageTransitioned
            ? `Task started. Asset transitioned to 'Under Maintenance'.`
            : `Maintenance task '${log.title}' is now In Progress.`
        );
        fetchLogs();
      }
    } catch (err) {
      console.error('Start maintenance error:', err);
      toast.error(err.response?.data?.message || err.message || 'Could not start task');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Maintenance
  const handleDeleteTask = async () => {
    if (!activeLog) return;
    try {
      setActionLoading(true);
      const res = await api.delete(`/maintenance/${activeLog._id}`);
      if (res.data?.success) {
        toast.success('Work order deleted');
        fetchLogs();
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to delete task');
    } finally {
      setActionLoading(false);
      setDeleteConfirmOpen(false);
      setActiveLog(null);
    }
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    statusParam || typeParam || techParam || fromParam || toParam || overdueParam
  );

  // Status Badge Helper
  const renderStatusBadge = (status, scheduledDate) => {
    const isOverdue =
      status === 'overdue' ||
      (status === 'scheduled' && new Date(scheduledDate) < new Date());

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
          <Clock className="w-3 h-3" />
          <span>Overdue</span>
        </span>
      );
    }

    const map = {
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
          map[status] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {status?.replace('_', ' ')}
      </span>
    );
  };

  // ==========================================
  // CALENDAR COMPUTATION HELPERS
  // ==========================================
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map tasks by date YYYY-MM-DD
  const tasksByDay = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      if (log.scheduledDate) {
        const dStr = log.scheduledDate.slice(0, 10);
        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(log);
      }
    });
    return map;
  }, [logs]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
    setSelectedDayTasks(null);
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
    setSelectedDayTasks(null);
  };

  const handleSelectDay = (dayNum) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDayStr(dStr);
    setSelectedDayTasks(tasksByDay[dStr] || []);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Page Header */}
      <PageHeader
        title="Maintenance Management"
        subtitle={
          isTechnician
            ? 'View and manage your assigned equipment work orders, start repairs, and record completed tasks.'
            : 'Schedule preventative maintenance, assign field technicians, and track work orders across infrastructure.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* List / Calendar View Toggle */}
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>

            {canManage && (
              <Button
                variant="primary"
                icon={Plus}
                size="sm"
                onClick={() => setCreateModalOpen(true)}
              >
                Schedule Work Order
              </Button>
            )}
          </div>
        }
      />

      {/* FILTER BAR (FOR LIST VIEW) */}
      {viewMode === 'list' && (
        <Card className="p-4 sm:p-5">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Status Select */}
              <Select
                value={statusParam}
                onChange={(e) => updateQueryParam({ status: e.target.value })}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              {/* Type Select */}
              <Select
                value={typeParam}
                onChange={(e) => updateQueryParam({ type: e.target.value })}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>

              {/* Technician Select (Admin / Manager) */}
              {canManage && (
                <Select
                  value={techParam}
                  onChange={(e) => updateQueryParam({ technician: e.target.value })}
                >
                  <option value="">All Technicians</option>
                  {technicians.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}

              {/* Date From */}
              <Input
                type="date"
                placeholder="From date"
                value={fromParam}
                onChange={(e) => updateQueryParam({ from: e.target.value })}
              />

              {/* Date To */}
              <Input
                type="date"
                placeholder="To date"
                value={toParam}
                onChange={(e) => updateQueryParam({ to: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <Checkbox
                label="Overdue Work Orders Only"
                checked={overdueParam}
                onChange={(e) => updateQueryParam({ overdue: e.target.checked })}
              />

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* 1. LIST VIEW RENDERING */}
      {/* ======================================================== */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" text="Loading maintenance work orders..." />
            </div>
          ) : logs.length === 0 ? (
            <Card className="py-16">
              <EmptyState
                icon={Wrench}
                title={hasActiveFilters ? 'No work orders match filters' : 'No maintenance tasks scheduled'}
                description={
                  hasActiveFilters
                    ? 'Try clearing your filters to see all maintenance logs.'
                    : 'Create a preventative or corrective maintenance work order to get started.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" onClick={handleClearFilters}>
                      Reset Filters
                    </Button>
                  ) : canManage ? (
                    <Button
                      variant="primary"
                      icon={Plus}
                      onClick={() => setCreateModalOpen(true)}
                    >
                      Schedule Work Order
                    </Button>
                  ) : null
                }
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Work Order</th>
                        <th className="py-3 px-4">Asset</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Scheduled Date</th>
                        <th className="py-3 px-4">Technician</th>
                        <th className="py-3 px-4 text-right">Cost</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map((log) => {
                        const isOverdue =
                          log.status === 'overdue' ||
                          (log.status === 'scheduled' &&
                            new Date(log.scheduledDate) < new Date());

                        return (
                          <tr
                            key={log._id}
                            className={`transition-colors ${
                              isOverdue
                                ? 'bg-rose-50/50 hover:bg-rose-100/60'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Title & Notes */}
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900 line-clamp-1">
                                {log.title}
                              </p>
                              {log.notes && (
                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                  {log.notes}
                                </p>
                              )}
                            </td>

                            {/* Asset Tag & Name */}
                            <td className="py-3 px-4">
                              {log.asset ? (
                                <Link
                                  to={`/assets/${log.asset._id}`}
                                  className="font-medium text-primary-600 hover:underline block truncate max-w-[180px]"
                                >
                                  {log.asset.name}
                                  <span className="font-mono text-[10px] text-slate-400 block">
                                    {log.asset.assetTag}
                                  </span>
                                </Link>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>

                            {/* Type */}
                            <td className="py-3 px-4 capitalize text-slate-600 font-medium">
                              {log.type}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              {renderStatusBadge(log.status, log.scheduledDate)}
                            </td>

                            {/* Scheduled Date */}
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {formatDate(log.scheduledDate)}
                            </td>

                            {/* Technician */}
                            <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                              {log.technician?.name || (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>

                            {/* Cost */}
                            <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                              {formatCurrency(log.cost || 0)}
                            </td>

                            {/* Actions by Role */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* START: for scheduled/overdue */}
                                {(log.status === 'scheduled' || log.status === 'overdue') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={Play}
                                    className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                    onClick={() => handleStartTask(log)}
                                    title="Start Task"
                                  >
                                    Start
                                  </Button>
                                )}

                                {/* COMPLETE: for in_progress or scheduled */}
                                {log.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={CheckCircle}
                                    className="text-primary-700 hover:bg-primary-50 border-primary-300"
                                    onClick={() => {
                                      setActiveLog(log);
                                      setCompleteModalOpen(true);
                                    }}
                                    title="Complete Task"
                                  >
                                    Complete
                                  </Button>
                                )}

                                {/* EDIT / DELETE: admin & manager */}
                                {canManage && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setActiveLog(log);
                                        setEditModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                      title="Edit Task"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveLog(log);
                                        setDeleteConfirmOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                      title="Delete Task"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards View (md:hidden) */}
              <div className="md:hidden space-y-3">
                {logs.map((log) => {
                  const isOverdue =
                    log.status === 'overdue' ||
                    (log.status === 'scheduled' &&
                      new Date(log.scheduledDate) < new Date());

                  return (
                    <div
                      key={log._id}
                      className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 ${
                        isOverdue
                          ? 'border-rose-300 bg-rose-50/30'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">
                            {log.title}
                          </h4>
                          {log.asset && (
                            <Link
                              to={`/assets/${log.asset._id}`}
                              className="text-xs text-primary-600 font-medium hover:underline block mt-0.5"
                            >
                              Asset: {log.asset.name} ({log.asset.assetTag})
                            </Link>
                          )}
                        </div>
                        {renderStatusBadge(log.status, log.scheduledDate)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Type</span>
                          <span className="font-medium capitalize">{log.type}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Scheduled</span>
                          <span className="font-medium">{formatDate(log.scheduledDate)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Technician</span>
                          <span className="font-medium">{log.technician?.name || 'Unassigned'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Incurred Cost</span>
                          <span className="font-bold text-slate-900">{formatCurrency(log.cost || 0)}</span>
                        </div>
                      </div>

                      {/* Mobile action bar */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {(log.status === 'scheduled' || log.status === 'overdue') && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Play}
                            className="text-emerald-700 border-emerald-300"
                            onClick={() => handleStartTask(log)}
                          >
                            Start
                          </Button>
                        )}
                        {log.status !== 'completed' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle}
                            onClick={() => {
                              setActiveLog(log);
                              setCompleteModalOpen(true);
                            }}
                          >
                            Complete
                          </Button>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setActiveLog(log);
                                setEditModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveLog(log);
                                setDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalCount={pagination.totalLogs}
                    limit={pagination.limit}
                    onPageChange={(p) => updateQueryParam({ page: p })}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* 2. CALENDAR VIEW RENDERING */}
      {/* ======================================================== */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          <Card className="p-5">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary-600" />
                <span>
                  {monthNames[month]} {year}
                </span>
              </h3>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" icon={ChevronLeft} onClick={handlePrevMonth}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarDate(new Date())}
                >
                  Today
                </Button>
                <Button variant="outline" size="sm" icon={ChevronRight} iconPosition="right" onClick={handleNextMonth}>
                  Next
                </Button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-4 pb-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Month Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Padding empty slots for preceding month days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-16 sm:min-h-24 bg-slate-50/50 rounded-xl" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayTasks = tasksByDay[dStr] || [];
                const isSelected = selectedDayStr === dStr;
                const isToday =
                  new Date().toISOString().slice(0, 10) === dStr;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => handleSelectDay(dayNum)}
                    className={`min-h-16 sm:min-h-24 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/60 ring-2 ring-primary-500/20 shadow-xs'
                        : isToday
                        ? 'border-primary-300 bg-white font-bold'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center'
                            : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Small preview of task pills on day cell */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t._id}
                          className={`text-[9px] sm:text-[10px] truncate px-1 rounded font-medium ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-primary-100 text-primary-800'
                          }`}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-medium block">
                          +{dayTasks.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Selected Day Work Orders Details Panel */}
          {selectedDayStr && (
            <Card
              title={`Work Orders for ${formatDate(selectedDayStr)}`}
              subtitle={`${selectedDayTasks?.length || 0} scheduled maintenance task(s)`}
              headerAction={
                canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={() => setCreateModalOpen(true)}
                  >
                    Schedule On This Day
                  </Button>
                )
              }
            >
              {selectedDayTasks?.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">
                  No work orders scheduled for this specific date.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedDayTasks.map((task) => (
                    <div
                      key={task._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {task.title}
                          </h4>
                          {renderStatusBadge(task.status, task.scheduledDate)}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Asset:{' '}
                          <Link
                            to={`/assets/${task.asset?._id}`}
                            className="text-primary-600 font-medium hover:underline"
                          >
                            {task.asset?.name || 'Unassigned'} ({task.asset?.assetTag})
                          </Link>{' '}
                          • Assigned:{' '}
                          <span className="font-semibold text-slate-700">
                            {task.technician?.name || 'Unassigned'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(task.status === 'scheduled' || task.status === 'overdue') && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Play}
                            className="text-emerald-700 border-emerald-300"
                            onClick={() => handleStartTask(task)}
                          >
                            Start
                          </Button>
                        )}
                        {task.status !== 'completed' && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={CheckCircle}
                            onClick={() => {
                              setActiveLog(task);
                              setCompleteModalOpen(true);
                            }}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODALS */}
      {/* ======================================================== */}
      {/* Create Work Order Modal */}
      <CreateWorkOrderModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        technicians={technicians}
        onSuccess={() => fetchLogs()}
      />

      {/* Edit Work Order Modal */}
      <EditMaintenanceModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setActiveLog(null);
        }}
        log={activeLog}
        technicians={technicians}
        onSuccess={() => fetchLogs()}
      />

      {/* Complete Maintenance Modal */}
      <CompleteMaintenanceModal
        isOpen={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setActiveLog(null);
        }}
        log={activeLog}
        onSuccess={() => fetchLogs()}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setActiveLog(null);
        }}
        onConfirm={handleDeleteTask}
        title="Delete Work Order"
        message={`Are you sure you want to delete work order "${activeLog?.title}"?`}
        confirmText="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
