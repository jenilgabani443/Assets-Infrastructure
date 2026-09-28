import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Boxes,
  Lock,
  Mail,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Input } from '../../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans">
      {/* Left Column: Brand Showcase (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white relative flex-col justify-between p-12 overflow-hidden">
        {/* Subtle glowing background accents */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="flex items-center space-x-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
              InfraAsset
            </h1>
            <span className="text-xs text-primary-400 font-medium tracking-wide uppercase">
              Municipal & Enterprise Asset Management
            </span>
          </div>
        </div>

        {/* Center Hero Copy & Highlights */}
        <div className="my-auto py-12 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-primary-400" />
            <span>Full-Lifecycle Infrastructure Tracking</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white mb-4">
            Total visibility over your city and enterprise infrastructure.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            From procurement and installation to scheduled maintenance and decommissioning. Track GIS locations, automate service schedules, and scan QR tags on-site.
          </p>

          {/* Quick stats/features list */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5 text-primary-400 font-medium text-xs mb-1">
                <MapPin className="w-4 h-4" />
                <span>GIS Mapping</span>
              </div>
              <p className="text-xs text-slate-300">
                Interactive real-time map with category and stage filters.
              </p>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-xl p-3.5">
              <div className="flex items-center gap-2.5 text-amber-400 font-medium text-xs mb-1">
                <Clock className="w-4 h-4" />
                <span>Predictive Upkeep</span>
              </div>
              <p className="text-xs text-slate-300">
                Automated warranty alerts & overdue maintenance tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 z-10 flex items-center justify-between border-t border-slate-800/80 pt-6">
          <span>&copy; {new Date().getFullYear()} InfraAsset Management Platform</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> v1.0 Production
          </span>
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Logo Header */}
          <div className="flex items-center space-x-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">InfraAsset</h1>
              <span className="text-xs text-primary-600 font-semibold">Lifecycle System</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Enter your credentials to access your organization's assets.
            </p>
          </div>

          {/* Quick Demo Selector */}
          <div className="mb-6 p-4 bg-slate-100 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                <span>Quick-fill Demo Accounts</span>
              </span>
              <span className="text-[10px] text-slate-600 font-medium">Password: Demo@1234</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@demo.com', 'admin')}
                className="py-1.5 px-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-medium text-slate-700 hover:text-rose-700 transition-colors shadow-2xs text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('manager@demo.com', 'manager')}
                className="py-1.5 px-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-700 transition-colors shadow-2xs text-center"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('tech@demo.com', 'technician')}
                className="py-1.5 px-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg text-xs font-medium text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs text-center"
              >
                Technician
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm font-medium flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@demo.com"
            />

            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full justify-center shadow-md shadow-primary-500/20"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* System Security Notice */}
          <p className="mt-8 text-center text-xs text-slate-600">
            Protected by Enterprise RBAC & JWT Authentication
          </p>
        </div>
      </div>
    </div>
  );
}
