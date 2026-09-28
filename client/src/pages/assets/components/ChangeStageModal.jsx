import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { Modal, Button, Textarea, Select } from '../../../components/ui';
import { ALLOWED_STAGE_TRANSITIONS } from '../../../utils';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

export default function ChangeStageModal({
  isOpen,
  onClose,
  asset,
  onSuccess
}) {
  const { toast } = useToast();
  const currentStage = asset?.lifecycleStage || 'Planned';
  const allowedNextStages = ALLOWED_STAGE_TRANSITIONS[currentStage] || [];

  const [toStage, setToStage] = useState(allowedNextStages[0] || '');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle stage transition submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!toStage) {
      setError('Please choose a target lifecycle stage');
      return;
    }

    if (!remarks.trim()) {
      setError('Transition remarks or reason is required');
      return;
    }

    try {
      setLoading(true);
      const res = await api.patch(`/assets/${asset._id}/lifecycle`, {
        toStage,
        remarks: remarks.trim()
      });

      if (res.data?.success) {
        toast.success(`Asset transitioned to '${toStage}'`);
        onSuccess?.(res.data.data);
        onClose();
        setRemarks('');
      } else {
        throw new Error(res.data?.message || 'Lifecycle transition failed');
      }
    } catch (err) {
      console.error('Lifecycle transition error:', err);
      const serverMsg =
        err.response?.data?.message || 'Failed to update lifecycle stage';
      const allowedMsg = err.response?.data?.allowedNextStages
        ? ` Allowed: ${err.response.data.allowedNextStages.join(', ')}`
        : '';
      setError(`${serverMsg}${allowedMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setError('');
        onClose();
      }}
      title="Change Lifecycle Stage"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-500 font-medium">Current Stage:</span>
          <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            {currentStage}
          </span>
        </div>

        {allowedNextStages.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            This asset is in the terminal <strong>{currentStage}</strong> stage. No further lifecycle transitions are allowed.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Stage <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full text-sm rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 shadow-2xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={toStage}
                onChange={(e) => setToStage(e.target.value)}
                required
              >
                {allowedNextStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <Textarea
              label="Remarks / Transition Reason"
              required
              rows={3}
              placeholder="e.g. Commissioned after passing final safety audit and pressure testing."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              helper="Audit trail requires an explanatory note for this lifecycle update."
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={RefreshCw}
                loading={loading}
              >
                Confirm Transition
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
