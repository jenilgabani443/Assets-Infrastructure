import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Power,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  Pagination,
  EmptyState
} from '../../components/ui';
import { formatDate } from '../../utils';
import UserModal from './components/UserModal';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;

      const res = await api.get('/users', { params });

      if (res.data?.success) {
        const list = Array.isArray(res.data.data)
          ? res.data.data
          : res.data.data?.users || [];
        setUsers(list);

        setPagination({
          currentPage: res.data.page || 1,
          totalPages: res.data.pages || 1,
          totalUsers: res.data.total !== undefined ? res.data.total : list.length
        });
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Active Status Toggle
  const handleToggleActive = async (targetUser) => {
    if (targetUser._id === currentUser?._id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }

    const nextState = !targetUser.isActive;
    try {
      const res = await api.put(`/users/${targetUser._id}`, {
        isActive: nextState
      });

      if (res.data?.success) {
        toast.success(
          `User '${targetUser.name}' ${nextState ? 'activated' : 'deactivated'}`
        );
        fetchUsers();
      }
    } catch (err) {
      console.error('Toggle active error:', err);
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            Admin
          </span>
        );
      case 'manager':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
            Manager
          </span>
        );
      case 'technician':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            Technician
          </span>
        );
      default:
        return <Badge variant="default">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="User & Access Administration"
        subtitle="Manage authorized municipal staff, field technician dispatches, and role-based permissions."
        actions={
          <Button
            variant="primary"
            icon={UserPlus}
            size="sm"
            onClick={() => {
              setSelectedUser(null);
              setUserModalOpen(true);
            }}
          >
            Add New User
          </Button>
        }
      />

      {/* FILTER BAR */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search personnel by name or email address..."
              icon={Search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All System Roles</option>
              <option value="admin">Administrators</option>
              <option value="manager">Operations Managers</option>
              <option value="technician">Field Technicians</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* USERS TABLE */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" text="Loading user directory..." />
        </div>
      ) : users.length === 0 ? (
        <Card className="py-16">
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="No personnel accounts matched your search criteria."
            action={
              (search || roleFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u._id === currentUser?._id;

                    return (
                      <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm flex-shrink-0">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.2 rounded border border-primary-200">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-500 text-[11px]">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getRoleBadge(u.role)}
                        </td>

                        {/* Active Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Deactivated</span>
                            </span>
                          )}
                        </td>

                        {/* Creation Date */}
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Edit}
                              onClick={() => {
                                setSelectedUser(u);
                                setUserModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>

                            <Button
                              variant={u.isActive ? 'outline' : 'primary'}
                              size="sm"
                              disabled={isSelf}
                              icon={Power}
                              className={
                                u.isActive
                                  ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }
                              onClick={() => handleToggleActive(u)}
                              title={
                                isSelf
                                  ? 'Cannot deactivate own account'
                                  : u.isActive
                                  ? 'Deactivate User'
                                  : 'Activate User'
                              }
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalCount={pagination.totalUsers}
                limit={10}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* USER CREATE / EDIT MODAL */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUser(null);
        }}
        userToEdit={selectedUser}
        currentUserId={currentUser?._id}
        onSuccess={() => fetchUsers()}
      />
    </div>
  );
}
