import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Save } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from '../../../components/ui';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

export default function EditMaintenanceModal({
  isOpen,
  onClose,
  log,
  technicians = [],
  onSuccess
}) {
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('preventive');
  const [scheduledDate, setScheduledDate] = useState('');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (log && isOpen) {
      setTitle(log.title || '');
      setType(log.type || 'preventive');
      setScheduledDate(
        log.scheduledDate ? log.scheduledDate.slice(0, 10) : ''
      );
      setTechnician(log.technician?._id || log.technician || '');
      setNotes(log.notes || '');
      setError('');
    }
  }, [log, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/maintenance/${log._id}`, {
        title: title.trim(),
        type,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        technician: technician || null,
        notes: notes.trim()
      });

      if (res.data?.success) {
        toast.success('Work order updated');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update maintenance error:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Failed to update work order';
      const validationDetails = err.response?.data?.errors?.map((e) => e.message || e.msg).join(', ');
      setError(validationDetails ? `${serverMsg}: ${validationDetails}` : serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Maintenance Work Order"
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
          label="Work Order Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="preventive">Preventive Upkeep</option>
            <option value="corrective">Corrective Repair</option>
            <option value="inspection">Safety / Inspection</option>
          </Select>

          <Input
            label="Scheduled Date"
            type="date"
            required
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>

        <Select
          label="Assigned Technician"
          value={technician}
          onChange={(e) => setTechnician(e.target.value)}
        >
          <option value="">-- Unassigned --</option>
          {technicians.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.email})
            </option>
          ))}
        </Select>

        <Textarea
          label="Notes / Instructions"
          rows={3}
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
            icon={Save}
            loading={submitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
