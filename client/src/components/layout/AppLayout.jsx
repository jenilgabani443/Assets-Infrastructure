import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Wrench,
  MapPin,
  QrCode,
  Tags,
  Users as UsersIcon,
  Bell,
  User,
  Lock,
  LogOut,
  Menu,
  X,
  ChevronDown,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Calendar,
  CheckCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import { Modal, Button, Input, Badge } from '../ui';
import { formatDate } from '../../utils';

export default function AppLayout() {
  const { user, role, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User dropdown menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Notifications dropdown
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState({
    overdueMaintenance: [],
    expiringWarranties: [],
    endOfLifeAssets: [],
    totalAlerts: 0
  });
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Change password modal
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await api.get('/notifications');
      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setPasswordSubmitting(true);
      const res = await api.patch('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.data?.success) {
        toast.success('Password changed successfully');
        setChangePasswordOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Nav items configuration based on role
  // Technicians don't see Categories or Users; managers don't see Users
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Assets', path: '/assets', icon: Boxes },
    { label: 'Maintenance', path: '/maintenance', icon: Wrench },
    { label: 'Map View', path: '/map', icon: MapPin },
    { label: 'Scan QR', path: '/scan', icon: QrCode },
    ...(role === 'admin' || role === 'manager'
      ? [{ label: 'Categories', path: '/categories', icon: Tags }]
      : []),
    ...(role === 'admin'
      ? [{ label: 'User Management', path: '/users', icon: UsersIcon }]
      : [])
  ];

  // Helper for current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/assets/new')) return 'New Asset';
    if (path.startsWith('/assets/') && path.includes('/edit')) return 'Edit Asset';
    if (path.startsWith('/assets/')) return 'Asset Details';
    if (path.startsWith('/assets')) return 'Asset Inventory';
    if (path.startsWith('/maintenance')) return 'Maintenance Logs';
    if (path.startsWith('/map')) return 'Asset GIS Map';
    if (path.startsWith('/scan')) return 'Scan Asset QR';
    if (path.startsWith('/categories')) return 'Asset Categories';
    if (path.startsWith('/users')) return 'User Management';
    if (path.startsWith('/profile')) return 'User Profile';
    return 'Asset Management';
  };

  const roleColor = {
    admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    manager: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    technician: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }[role] || 'bg-slate-500/10 text-slate-400';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0 z-30 select-none">
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform duration-200">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight leading-tight block">
                InfraAsset
              </span>
              <span className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider block">
                Lifecycle Manager
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer / User Quick Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-primary-400 text-sm flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <span
                className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border ${roleColor}`}
              >
                {role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-300">
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                  <Boxes className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-base">InfraAsset</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-primary-400 text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              {getCurrentPageTitle()}
            </h1>
          </div>

          {/* Right Action Icons: Notifications & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (!notifOpen) fetchNotifications();
                }}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.totalAlerts > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                    {notifications.totalAlerts > 99 ? '99+' : notifications.totalAlerts}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">Alerts & Notifications</span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-full">
                        {notifications.totalAlerts}
                      </span>
                    </div>
                    <button
                      onClick={fetchNotifications}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.totalAlerts === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-sm font-medium text-slate-700">All systems clear!</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          No overdue maintenance or expiring warranties.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Overdue Maintenance items */}
                        {notifications.overdueMaintenance?.length > 0 && (
                          <div className="p-2">
                            <div className="px-2 py-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Overdue Maintenance ({notifications.overdueMaintenance.length})</span>
                            </div>
                            {notifications.overdueMaintenance.map((m) => (
                              <Link
                                key={m._id}
                                to={`/maintenance`}
                                onClick={() => setNotifOpen(false)}
                                className="block p-2.5 rounded-xl hover:bg-amber-50/60 transition-colors group"
                              >
                                <div className="flex items-start justify-between">
                                  <p className="text-xs font-semibold text-slate-800 group-hover:text-amber-800">
                                    {m.title}
                                  </p>
                                  <span className="text-[10px] text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded">
                                    Overdue
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  Asset: {m.asset?.name || 'Unknown'} • Due: {formatDate(m.scheduledDate)}
                                </p>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Expiring Warranties */}
                        {notifications.expiringWarranties?.length > 0 && (
                          <div className="p-2">
                            <div className="px-2 py-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Expiring Warranties ({notifications.expiringWarranties.length})</span>
                            </div>
                            {notifications.expiringWarranties.map((a) => (
                              <Link
                                key={a._id}
                                to={`/assets/${a._id}`}
                                onClick={() => setNotifOpen(false)}
                                className="block p-2.5 rounded-xl hover:bg-blue-50/60 transition-colors group"
                              >
                                <div className="flex items-start justify-between">
                                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-800">
                                    {a.name}
                                  </p>
                                  <span className="text-[10px] text-blue-600 font-medium bg-blue-100 px-1.5 py-0.5 rounded">
                                    {a.assetTag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Expires: {formatDate(a.warrantyExpiry)}
                                </p>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* End of Life Assets */}
                        {notifications.endOfLifeAssets?.length > 0 && (
                          <div className="p-2">
                            <div className="px-2 py-1 flex items-center gap-1.5 text-xs font-semibold text-rose-700 uppercase tracking-wider">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Lifespan Exceeded ({notifications.endOfLifeAssets.length})</span>
                            </div>
                            {notifications.endOfLifeAssets.map((a) => (
                              <Link
                                key={a._id}
                                to={`/assets/${a._id}`}
                                onClick={() => setNotifOpen(false)}
                                className="block p-2.5 rounded-xl hover:bg-rose-50/60 transition-colors group"
                              >
                                <div className="flex items-start justify-between">
                                  <p className="text-xs font-semibold text-slate-800 group-hover:text-rose-800">
                                    {a.name}
                                  </p>
                                  <span className="text-[10px] text-rose-600 font-medium bg-rose-100 px-1.5 py-0.5 rounded">
                                    {a.assetTag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Expected lifespan reached ({a.expectedLifespanYears} yrs)
                                </p>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-slate-500 capitalize">{role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-700">
                        {role}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Account Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setChangePasswordOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={logout}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setPasswordError('');
        }}
        title="Change Password"
        size="sm"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {passwordError}
            </div>
          )}
          <Input
            label="Current Password"
            type="password"
            required
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="••••••••"
          />
          <Input
            label="New Password"
            type="password"
            required
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="At least 6 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="Re-enter new password"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangePasswordOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={passwordSubmitting}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
