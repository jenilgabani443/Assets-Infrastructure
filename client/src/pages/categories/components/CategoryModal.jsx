import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Save,
  Tag,
  ListPlus,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { Modal, Button, Input, Select, Textarea, Checkbox } from '../../../components/ui';
import api from '../../../api/axios';
import { useToast } from '../../../context/ToastContext';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown Select' },
  { value: 'boolean', label: 'Boolean (Yes/No)' }
];

// Helper to slugify label into camelCase key
const slugifyKey = (label) => {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
};

export default function CategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess
}) {
  const { toast } = useToast();
  const isEdit = Boolean(category);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Box');
  const [fields, setFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name || '');
        setDescription(category.description || '');
        setIcon(category.icon || 'Box');
        setFields(
          category.fieldDefinitions
            ? category.fieldDefinitions.map((f) => ({
                name: f.name || '',
                label: f.label || '',
                type: f.type || 'text',
                required: Boolean(f.required),
                unit: f.unit || '',
                options: f.options ? [...f.options] : [],
                newOptionText: ''
              }))
            : []
        );
      } else {
        setName('');
        setDescription('');
        setIcon('Box');
        setFields([]);
      }
      setError('');
    }
  }, [isOpen, category]);

  // Field manipulation helpers
  const handleAddField = () => {
    setFields((prev) => [
      ...prev,
      {
        name: `field_${prev.length + 1}`,
        label: '',
        type: 'text',
        required: false,
        unit: '',
        options: [],
        newOptionText: ''
      }
    ]);
  };

  const handleRemoveField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveField = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    setFields((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const handleFieldChange = (index, prop, value) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [prop]: value };

      // Auto-update key when label changes if key wasn't manually customized
      if (prop === 'label' && value) {
        const autoKey = slugifyKey(value);
        if (autoKey) {
          next[index].name = autoKey;
        }
      }
      return next;
    });
  };

  // Add option to select field
  const handleAddOption = (fieldIndex) => {
    const field = fields[fieldIndex];
    const optText = field.newOptionText?.trim();
    if (!optText) return;

    if (field.options?.includes(optText)) {
      toast.error('Option already exists');
      return;
    }

    setFields((prev) => {
      const next = [...prev];
      next[fieldIndex] = {
        ...next[fieldIndex],
        options: [...(next[fieldIndex].options || []), optText],
        newOptionText: ''
      };
      return next;
    });
  };

  const handleRemoveOption = (fieldIndex, optIndex) => {
    setFields((prev) => {
      const next = [...prev];
      next[fieldIndex] = {
        ...next[fieldIndex],
        options: next[fieldIndex].options.filter((_, i) => i !== optIndex)
      };
      return next;
    });
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    // Validate unique keys and required select options
    const keysSeen = new Set();
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) {
        setError(`Field #${i + 1} must have a label`);
        return;
      }
      if (!f.name.trim()) {
        setError(`Field #${i + 1} must have a unique key`);
        return;
      }
      if (keysSeen.has(f.name.trim().toLowerCase())) {
        setError(`Duplicate field key detected: '${f.name}'. Keys must be unique.`);
        return;
      }
      keysSeen.add(f.name.trim().toLowerCase());

      if (f.type === 'select' && (!f.options || f.options.length === 0)) {
        setError(`Dropdown field '${f.label}' must have at least one selectable option.`);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim() || 'Box',
      fieldDefinitions: fields.map((f) => ({
        name: f.name.trim(),
        label: f.label.trim(),
        type: f.type,
        required: Boolean(f.required),
        unit: f.unit?.trim() || undefined,
        options: f.type === 'select' ? f.options : undefined
      }))
    };

    try {
      setSubmitting(true);
      let res;
      if (isEdit) {
        res = await api.put(`/categories/${category._id}`, payload);
      } else {
        res = await api.post('/categories', payload);
      }

      if (res.data?.success) {
        toast.success(isEdit ? 'Category updated successfully' : 'Category created successfully');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res.data?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Category save error:', err);
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Category: ${category?.name}` : 'Create Asset Category'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Category Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Category Name"
              required
              placeholder="e.g. Civil and Public Works"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Icon (Emoji or Lucide name)"
              placeholder="e.g. HardHat, Zap, Radio"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>
        </div>

        <Textarea
          label="Category Description"
          rows={2}
          placeholder="Summary of municipal/enterprise infrastructure components governed by this category..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Field Definitions Schema Builder */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>Custom Technical Fields ({fields.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Attributes will dynamically render in asset creation, detail views, and CSV imports.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={handleAddField}
            >
              Add Attribute
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
              No custom attributes defined yet. Click "Add Attribute" to build the category schema.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 relative group hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-600">
                      Attribute #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveField(idx, -1)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMoveField(idx, 1)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Remove Attribute"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <Input
                        label="Display Label"
                        required
                        placeholder="e.g. Operating Voltage"
                        value={field.label}
                        onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Key Name"
                        required
                        placeholder="operatingVoltage"
                        value={field.name}
                        onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                        helper="Unique code key"
                      />
                    </div>
                    <div>
                      <Select
                        label="Data Type"
                        value={field.type}
                        onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    {(field.type === 'number' || field.type === 'text') && (
                      <div className="w-32">
                        <Input
                          label="Unit of Measure"
                          placeholder="e.g. kV, km, LPM"
                          value={field.unit}
                          onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                        />
                      </div>
                    )}

                    <div className="pt-5">
                      <Checkbox
                        label="Required field"
                        checked={field.required}
                        onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Options Editor for Select Type */}
                  {field.type === 'select' && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Dropdown Select Options ({field.options?.length || 0})
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 text-xs rounded-xl border border-slate-300 bg-white px-3 py-1.5 focus:border-primary-500 focus:outline-none"
                          placeholder="Add option (e.g. Single Phase)"
                          value={field.newOptionText || ''}
                          onChange={(e) =>
                            handleFieldChange(idx, 'newOptionText', e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOption(idx);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddOption(idx)}
                        >
                          Add
                        </Button>
                      </div>

                      {field.options?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {field.options.map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-800"
                            >
                              <span>{opt}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx, optIdx)}
                                className="text-slate-500 hover:text-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={submitting}
          >
            {isEdit ? 'Save Changes' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
