import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../../../components/ui';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

export default function CompleteMaintenanceModal({
  isOpen,
  onClose,
  log,
  onSuccess
}) {
  const { toast } = useToast();

  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (log && isOpen) {
      setCost(log.cost !== undefined && log.cost !== null ? log.cost : '');
      setNotes('');
      setError('');
    }
  }, [log, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setSubmitting(true);
      const res = await api.patch(`/maintenance/${log._id}/complete`, {
        cost: cost !== '' ? Number(cost) : undefined,
        notes: notes.trim() || undefined
      });

      if (res.data?.success) {
        toast.success(
          res.data.data?.assetReturnedToService
            ? 'Work completed! Asset restored to In Service.'
            : 'Maintenance marked as completed.'
        );
        onSuccess?.();
        onClose();
        setNotes('');
      } else {
        throw new Error(res.data?.message || 'Failed to complete task');
      }
    } catch (err) {
      console.error('Complete maintenance error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to complete work order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complete Work Order: ${log?.title || ''}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p className="font-semibold text-slate-800">Asset: {log?.asset?.name}</p>
          <p className="text-slate-500">
            Tag: <span className="font-mono font-medium text-primary-700">{log?.asset?.assetTag}</span> • Type: <span className="capitalize">{log?.type}</span>
          </p>
        </div>

        <Input
          label="Actual Incurred Cost (₹ INR)"
          type="number"
          step="any"
          placeholder="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          helper="Total expense including labor and replaced materials."
        />

        <Textarea
          label="Completion Notes & Findings"
          rows={3}
          placeholder="Describe work performed, parts replaced, or diagnostic measurements..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={CheckCircle}
            loading={submitting}
          >
            Mark Work Completed
          </Button>
        </div>
      </form>
    </Modal>
  );
}
