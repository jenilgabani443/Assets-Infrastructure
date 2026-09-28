import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ShieldCheck, AlertTriangle, Save, Plus } from 'lucide-react';
import { Modal, Button, Input, Select, Checkbox } from '../../../components/ui';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

export default function UserModal({
  isOpen,
  onClose,
  userToEdit,
  currentUserId,
  onSuccess
}) {
  const { toast } = useToast();
  const isEdit = Boolean(userToEdit);
  const isSelf = isEdit && userToEdit?._id === currentUserId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('technician');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setName(userToEdit.name || '');
        setEmail(userToEdit.email || '');
        setPassword('');
        setRole(userToEdit.role || 'technician');
        setIsActive(userToEdit.isActive !== false);
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setRole('technician');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, userToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!isEdit && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Self-demotion guard
    if (isSelf && role !== 'admin') {
      setError('You cannot remove the administrator role from your own account.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        const payload = {
          name: name.trim(),
          role,
          isActive
        };
        const res = await api.put(`/users/${userToEdit._id}`, payload);
        if (res.data?.success) {
          toast.success('User updated successfully');
          onSuccess?.();
          onClose();
        }
      } else {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          isActive
        };
        const res = await api.post('/users', payload);
        if (res.data?.success) {
          toast.success('User account created');
          onSuccess?.();
          onClose();
        }
      }
    } catch (err) {
      console.error('Save user error:', err);
      setError(err.response?.data?.message || 'Failed to save user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit User: ${userToEdit?.name}` : 'Add New User'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Full Name"
          required
          placeholder="e.g. Ramesh Patel"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="Email Address"
          type="email"
          required
          disabled={isEdit}
          placeholder="ramesh.patel@citycorp.gov.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helper={isEdit ? 'Email address cannot be changed after creation' : ''}
        />

        {!isEdit && (
          <Input
            label="Initial Password"
            type="password"
            required
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        <Select
          label="System Role"
          value={role}
          disabled={isSelf}
          onChange={(e) => setRole(e.target.value)}
          helper={isSelf ? 'Self-demotion protection: you cannot change your own role' : ''}
        >
          <option value="admin">Administrator (Full Access)</option>
          <option value="manager">Operations Manager (Assets & Upkeep)</option>
          <option value="technician">Field Technician (Assigned Work Orders)</option>
        </Select>

        <div className="pt-2">
          <Checkbox
            label="Account Active"
            checked={isActive}
            disabled={isSelf}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {isSelf && (
            <p className="text-[11px] text-slate-400 mt-1">
              You cannot deactivate your own administrative account.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={isEdit ? Save : Plus}
            loading={submitting}
          >
            {isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
