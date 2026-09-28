import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  KeyRound,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/axios';
import { PageHeader, Card, Button, Input, Badge } from '../../components/ui';
import { formatDate } from '../../utils';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password confirmation does not match');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.patch('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (res.data?.success) {
        toast.success('Your account password has been updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const roleDescriptions = {
    admin:
      'Full administrative access across all infrastructure catalogs, categories, lifecycle operations, and user administration.',
    manager:
      'Operational authority to register infrastructure, schedule maintenance, transition lifecycle stages, and configure category schemas.',
    technician:
      'Field authority to inspect assigned equipment, start work orders, record actual maintenance costs, and close tasks.'
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Account Profile & Credentials"
        subtitle="Manage your personal credentials, view assigned system privileges, and update authentication password."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: User Summary Card */}
        <div className="space-y-6">
          <Card className="p-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                {user?.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            </div>

            <div className="pt-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-100 text-primary-800 border border-primary-200">
                {role}
              </span>
            </div>

            <div className="text-left pt-4 border-t border-slate-100 text-xs space-y-2 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Status:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Active</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Member Since:</span>
                <span className="font-medium text-slate-700">
                  {formatDate(user?.createdAt || new Date())}
                </span>
              </div>
            </div>
          </Card>

          {/* Role Privileges Card */}
          <Card title="System Privileges">
            <div className="space-y-2 text-xs text-slate-600">
              <p className="leading-relaxed">
                {roleDescriptions[role] || 'Standard authenticated user privileges.'}
              </p>
            </div>
          </Card>
        </div>

        {/* Right 2 Columns: Change Password Form */}
        <div className="md:col-span-2">
          <Card
            title="Change Security Password"
            subtitle="Ensure your account uses a secure password with at least 6 characters"
          >
            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Current Password"
                type="password"
                required
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  icon={KeyRound}
                  loading={submitting}
                >
                  Update Account Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
