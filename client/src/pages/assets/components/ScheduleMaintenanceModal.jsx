import React, { useState, useEffect } from 'react';
import { Calendar, Wrench, AlertTriangle, UserCheck } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from '../../../components/ui';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

export default function ScheduleMaintenanceModal({
  isOpen,
  onClose,
  asset,
  onSuccess
}) {
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('preventive');
  const [scheduledDate, setScheduledDate] = useState('');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');

  const [techniciansList, setTechniciansList] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available technicians
  useEffect(() => {
    if (isOpen) {
      const fetchTechnicians = async () => {
        try {
          setLoadingTechs(true);
          const res = await api.get('/users?role=technician&limit=50');
          if (res.data?.success) {
            const list = Array.isArray(res.data.data) ? res.data.data : res.data.data?.users || [];
            setTechniciansList(list);
          }
        } catch (err) {
          console.warn('Could not fetch technicians:', err);
        } finally {
          setLoadingTechs(false);
        }
      };
      fetchTechnicians();

      // Set default scheduled date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Maintenance task title is required');
      return;
    }
    if (!scheduledDate) {
      setError('Scheduled date is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/maintenance', {
        asset: asset._id,
        title: title.trim(),
        type,
        scheduledDate: new Date(scheduledDate).toISOString(),
        technician: technician || undefined,
        notes: notes.trim() || undefined
      });

      if (res.data?.success) {
        toast.success('Maintenance work order scheduled');
        onSuccess?.();
        onClose();
        setTitle('');
        setNotes('');
      } else {
        throw new Error(res.data?.message || 'Scheduling failed');
      }
    } catch (err) {
      console.error('Schedule error:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Failed to schedule maintenance';
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
      title={`Schedule Maintenance: ${asset?.assetTag || ''}`}
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
          placeholder="e.g. Quarterly transformer oil dielectric test"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Maintenance Type"
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
          label="Assign Technician (Optional)"
          value={technician}
          onChange={(e) => setTechnician(e.target.value)}
        >
          <option value="">-- Unassigned (Dispatch Queue) --</option>
          {techniciansList.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.email})
            </option>
          ))}
        </Select>

        <Textarea
          label="Task Instructions / Notes"
          rows={3}
          placeholder="Special safety precautions, equipment serial numbers, or replacement parts needed..."
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
            icon={Wrench}
            loading={submitting}
          >
            Schedule Work Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
