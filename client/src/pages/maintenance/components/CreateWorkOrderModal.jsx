import React, { useState, useEffect } from 'react';
import { Wrench, Calendar, AlertTriangle, Plus } from 'lucide-react';
import { Modal, Button, Input, Select, Textarea } from '../../../components/ui';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

export default function CreateWorkOrderModal({
  isOpen,
  onClose,
  technicians = [],
  onSuccess
}) {
  const { toast } = useToast();

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('preventive');
  const [scheduledDate, setScheduledDate] = useState('');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchAssets = async () => {
        try {
          setLoadingAssets(true);
          const res = await api.get('/assets?limit=100');
          if (res.data?.success) {
            const list = Array.isArray(res.data.data) ? res.data.data : res.data.data?.assets || [];
            setAssets(list);
          }
        } catch (err) {
          console.warn('Failed to load assets for dropdown:', err);
        } finally {
          setLoadingAssets(false);
        }
      };
      fetchAssets();

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().slice(0, 10));
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!assetId) {
      setError('Please select an asset for this work order');
      return;
    }
    if (!title.trim()) {
      setError('Work order title is required');
      return;
    }
    if (!scheduledDate) {
      setError('Scheduled date is required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/maintenance', {
        asset: assetId,
        title: title.trim(),
        type,
        scheduledDate: new Date(scheduledDate).toISOString(),
        technician: technician || undefined,
        notes: notes.trim() || undefined
      });

      if (res.data?.success) {
        toast.success('Maintenance work order scheduled successfully');
        onSuccess?.();
        onClose();
        setTitle('');
        setNotes('');
        setAssetId('');
      } else {
        throw new Error(res.data?.message || 'Failed to schedule work order');
      }
    } catch (err) {
      console.error('Create error:', err);
      setError(err.response?.data?.message || 'Failed to schedule maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Maintenance Work Order"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Select
          label="Target Asset"
          required
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
        >
          <option value="">-- Choose Asset --</option>
          {assets.map((a) => (
            <option key={a._id} value={a._id}>
              {a.assetTag} - {a.name} ({a.category?.name || 'General'})
            </option>
          ))}
        </Select>

        <Input
          label="Work Order Title"
          required
          placeholder="e.g. Annual pressure testing & valve recalibration"
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
          <option value="">-- Unassigned (Dispatch Pool) --</option>
          {technicians.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.email})
            </option>
          ))}
        </Select>

        <Textarea
          label="Work Instructions / Notes"
          rows={3}
          placeholder="Required equipment, safety gear, or specific components..."
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
            icon={Plus}
            loading={submitting}
          >
            Schedule Work Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
