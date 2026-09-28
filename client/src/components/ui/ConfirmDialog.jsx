import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger, primary, warning
  isLoading = false,
}) => {
  const iconConfig = {
    danger: <AlertTriangle className="w-6 h-6 text-rose-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    primary: <Info className="w-6 h-6 text-primary-600" />,
  }[variant] || <Info className="w-6 h-6 text-primary-600" />;

  const iconBg = {
    danger: 'bg-rose-50 border-rose-100',
    warning: 'bg-amber-50 border-amber-100',
    primary: 'bg-primary-50 border-primary-100',
  }[variant] || 'bg-primary-50 border-primary-100';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full border flex-shrink-0 ${iconBg}`}>
          {iconConfig}
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-slate-900 leading-tight">
            {title}
          </h4>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
