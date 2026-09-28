import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Boxes,
  CheckCircle,
  Wrench,
  Clock,
  ShieldAlert,
  Coins,
  Calendar,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Tag,
  ChevronRight,
  ShieldCheck,
  User,
  Sliders
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  PageHeader,
  Card,
  StatCard,
  Badge,
  Spinner,
  EmptyState,
  Button,
  StatusBadge,
  LifecycleBadge
} from '../../components/ui';
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  LIFECYCLE_STAGE_META
} from '../../utils';

// Color palette for Category Donut Chart
const CATEGORY_COLORS = [
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#64748b'  // slate
];

// Stage color mapping
const STAGE_COLORS = {
  Planned: '#64748b',
  Procured: '#8b5cf6',
  Installed: '#3b82f6',
  'In Service': '#10b981',
  'Under Maintenance': '#f59e0b',
  Decommissioned: '#ef4444'
};

// Status color mapping for horizontal bar
const STATUS_COLORS = {
  operational: '#10b981',
  degraded: '#f59e0b',
  failed: '#ef4444',
  decommissioned: '#64748b',
  reserved: '#3b82f6'
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await api.get('/dashboard/stats');
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Failed to load statistics');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.response?.data?.message || err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Spinner size="lg" text="Loading infrastructure telemetry..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-12">
        <Card className="max-w-md mx-auto text-center p-8 border-rose-200 bg-rose-50/50">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Telemetry Unavailable</h2>
          <p className="text-sm text-slate-600 mt-1 mb-6">{error || 'Could not load dashboard data'}</p>
          <Button variant="primary" icon={RefreshCw} onClick={fetchStats}>
            Retry Loading
          </Button>
        </Card>
      </div>
    );
  }

  const {
    totals = {},
    byCategory = [],
    byLifecycleStage = [],
    byStatus = [],
    lifespanAlerts = {},
    warrantiesExpiringWithin30Days = {},
    maintenance = {},
    recentActivities = []
  } = stats;

  const inServiceCount =
    byLifecycleStage.find((s) => s.stage === 'In Service')?.count || 0;
  const underMaintenanceCount =
    byLifecycleStage.find((s) => s.stage === 'Under Maintenance')?.count || 0;

  // Custom tooltips for recharts
  const CurrencyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-xl border border-slate-700">
          <p className="font-semibold text-slate-200">{label}</p>
          <p className="text-emerald-400 mt-1">
            Cost: {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.taskCount !== undefined && (
            <p className="text-slate-400 text-[11px]">
              Tasks: {payload[0].payload.taskCount}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CountTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs rounded-lg p-2.5 shadow-xl border border-slate-700">
          <p className="font-semibold text-slate-200">{label || payload[0].name}</p>
          <p className="text-primary-400 mt-1">Assets: {payload[0].value}</p>
          {payload[0].payload.totalValue ? (
            <p className="text-slate-400 text-[11px]">
              Value: {formatCurrency(payload[0].payload.totalValue)}
            </p>
          ) : null}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header with quick refresh button */}
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Operator'}`}
        subtitle="Real-time operational monitoring, lifecycle progress, and predictive maintenance dispatch."
        actions={
          <Button
            variant="outline"
            icon={RefreshCw}
            loading={refreshing}
            onClick={handleRefresh}
            className="text-xs sm:text-sm"
          >
            Refresh Telemetry
          </Button>
        }
      />

      {/* 1. KEY KPI STAT CARDS (CLICKABLE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Assets -> /assets */}
        <StatCard
          label="Total Assets"
          value={totals.totalAssets || 0}
          icon={Boxes}
          color="primary"
          change="Full Catalog"
          onClick={() => navigate('/assets')}
          className="cursor-pointer hover:border-primary-300 transition-all hover:scale-[1.02]"
        />

        {/* In Service -> /assets?lifecycleStage=In Service */}
        <StatCard
          label="In Service"
          value={inServiceCount}
          icon={CheckCircle}
          color="emerald"
          change="Operational"
          onClick={() => navigate('/assets?lifecycleStage=In%20Service')}
          className="cursor-pointer hover:border-emerald-300 transition-all hover:scale-[1.02]"
        />

        {/* Under Maintenance -> /assets?lifecycleStage=Under Maintenance */}
        <StatCard
          label="Under Maintenance"
          value={underMaintenanceCount}
          icon={Wrench}
          color="amber"
          change="Active Service"
          onClick={() => navigate('/assets?lifecycleStage=Under%20Maintenance')}
          className="cursor-pointer hover:border-amber-300 transition-all hover:scale-[1.02]"
        />

        {/* Overdue Maintenance -> /maintenance?status=overdue */}
        <StatCard
          label="Overdue Tasks"
          value={maintenance.overdueCount || 0}
          icon={Clock}
          color="rose"
          change={maintenance.overdueCount > 0 ? 'Urgent Action' : 'All Clear'}
          onClick={() => navigate('/maintenance?status=overdue')}
          className="cursor-pointer hover:border-rose-300 transition-all hover:scale-[1.02]"
        />

        {/* Warranties Expiring -> /assets?warrantyExpiring=true */}
        <StatCard
          label="Warranties Expiring"
          value={warrantiesExpiringWithin30Days.count || 0}
          icon={ShieldAlert}
          color="indigo"
          change="Next 30 Days"
          onClick={() => navigate('/assets?warrantyExpiring=true')}
          className="cursor-pointer hover:border-indigo-300 transition-all hover:scale-[1.02]"
        />

        {/* Total Valuation -> /assets */}
        <StatCard
          label="Asset Valuation"
          value={formatCurrency(totals.totalValue || 0)}
          icon={Coins}
          color="blue"
          change="Estimated Value"
          onClick={() => navigate('/assets')}
          className="cursor-pointer hover:border-blue-300 transition-all hover:scale-[1.02]"
        />
      </div>

      {/* 2. CHARTS SECTION (2x2 GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Assets by Category (Donut Chart) */}
        <Card
          title="Assets by Category"
          subtitle="Portfolio distribution across civil, utility, telecom, facilities, transport & IT"
        >
          {byCategory.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No assets cataloged"
              description="Add assets to see category distribution."
            />
          ) : (
            <div className="h-72 w-full flex flex-col justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {byCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CountTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => (
                      <span className="text-xs text-slate-600 font-medium">{val}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* B. Assets by Lifecycle Stage (Bar Chart with Stage Colors) */}
        <Card
          title="Lifecycle Stage Breakdown"
          subtitle="Assets categorized by their current operational stage"
        >
          {byLifecycleStage.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No lifecycle data"
              description="Asset stage progression will appear here."
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byLifecycleStage}
                  margin={{ top: 15, right: 15, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {byLifecycleStage.map((entry, index) => (
                      <Cell
                        key={`stage-cell-${index}`}
                        fill={STAGE_COLORS[entry.stage] || '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* C. Maintenance Cost by Month (Area Chart) */}
        <Card
          title="Maintenance Expenditure (Last 6 Months)"
          subtitle="Monthly upkeep investment and work order volume"
        >
          {maintenance.costByMonthLast6Months?.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No maintenance records"
              description="Completed maintenance costs will appear over time."
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={maintenance.costByMonthLast6Months || []}
                  margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#costGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* D. Operational Status (Horizontal Bar Chart) */}
        <Card
          title="Operational Condition Status"
          subtitle="Current operational readiness and health rating across assets"
        >
          {byStatus.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No status data"
              description="Asset health status breakdown will appear here."
            />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={byStatus}
                  margin={{ top: 10, right: 25, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tick={{ fontSize: 11, fill: '#64748b', textTransform: 'capitalize' }}
                  />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {byStatus.map((entry, index) => (
                      <Cell
                        key={`status-cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* 3. LISTS SECTION (CRITICAL ALERTS & LOGISTICS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Overdue & Upcoming Maintenance */}
        <Card
          title="Maintenance Dispatch Queue"
          subtitle="Overdue work orders and preventative tasks scheduled in the next 14 days"
          headerAction={
            <Link
              to="/maintenance"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {maintenance.overdueCount === 0 &&
          (!maintenance.upcomingNext14Days || maintenance.upcomingNext14Days.length === 0) ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-slate-700">No Pending Maintenance</p>
              <p className="text-xs text-slate-400 mt-0.5">
                All scheduled tasks are completed and up to date.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {/* Overdue alert banner if any */}
              {maintenance.overdueCount > 0 && (
                <div
                  onClick={() => navigate('/maintenance?status=overdue')}
                  className="p-3 mb-2 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-100/70 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>{maintenance.overdueCount} overdue maintenance task(s) requiring attention</span>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 underline">Resolve</span>
                </div>
              )}

              {/* Upcoming tasks list */}
              {maintenance.upcomingNext14Days?.map((task) => (
                <div
                  key={task._id}
                  onClick={() => navigate(`/maintenance`)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-primary-600 truncate">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Asset: <span className="font-medium text-slate-700">{task.asset?.name || 'N/A'}</span> ({task.asset?.assetTag})
                      {task.technician && (
                        <span> • Tech: {task.technician.name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(task.scheduledDate)}
                    </span>
                    <Badge variant={task.status === 'overdue' ? 'danger' : 'info'} size="sm">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* B. Warranties Expiring & End-of-Life Assets */}
        <Card
          title="Lifecycle & Warranty Thresholds"
          subtitle="Equipment reaching maximum lifespan or warranty expiration"
        >
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {/* Warranties expiring in 30 days */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Expiring Warranties ({warrantiesExpiringWithin30Days.count || 0})</span>
                </span>
                <Link
                  to="/assets?warrantyExpiring=true"
                  className="text-[11px] font-medium text-primary-600 hover:underline"
                >
                  View all
                </Link>
              </div>

              {warrantiesExpiringWithin30Days.assets?.length === 0 ? (
                <p className="text-xs text-slate-400 py-1 italic">
                  No warranties expiring in the next 30 days.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {warrantiesExpiringWithin30Days.assets?.slice(0, 3).map((item) => (
                    <div
                      key={item._id}
                      onClick={() => navigate(`/assets/${item._id}`)}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/60 rounded-xl cursor-pointer transition-colors border border-slate-100 flex items-center justify-between group"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-medium text-slate-800 group-hover:text-indigo-700 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Tag: {item.assetTag} • {item.department || 'General'}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 flex-shrink-0 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                        Expires {formatDate(item.warrantyExpiry)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* End of Life assets */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Past Lifespan ({lifespanAlerts.pastLifespanCount || 0})</span>
                </span>
                <Link
                  to="/assets?endOfLife=true"
                  className="text-[11px] font-medium text-primary-600 hover:underline"
                >
                  View all
                </Link>
              </div>

              {lifespanAlerts.pastLifespan?.length === 0 ? (
                <p className="text-xs text-slate-400 py-1 italic">
                  No assets have exceeded their engineered lifespan.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {lifespanAlerts.pastLifespan?.slice(0, 3).map((item) => (
                    <div
                      key={item._id}
                      onClick={() => navigate(`/assets/${item._id}`)}
                      className="p-2.5 bg-rose-50/50 hover:bg-rose-100/60 rounded-xl cursor-pointer transition-colors border border-rose-100 flex items-center justify-between group"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-medium text-slate-800 group-hover:text-rose-700 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Tag: {item.assetTag} • {item.expectedLifespanYears}yr target
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-rose-600 flex-shrink-0 bg-rose-100 px-2 py-0.5 rounded-md">
                        {Math.round(item.ratio * 100)}% of lifespan
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. RECENT ACTIVITY FEED */}
      <Card
        title="Recent System Activity"
        subtitle="Latest audit trail of asset updates, lifecycle transitions, and maintenance dispatches"
      >
        {recentActivities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity recorded"
            description="System audit events will appear here as users perform actions."
          />
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {recentActivities.map((act) => (
              <div key={act._id} className="py-2.5 px-2 flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium">
                    {act.description || `${act.action} on ${act.entityType}`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    By <span className="font-semibold text-slate-700">{act.user?.name || 'System'}</span>
                    {act.user?.role && (
                      <span className="text-slate-400 capitalize"> ({act.user.role})</span>
                    )}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {formatRelativeTime(act.timestamp || act.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
