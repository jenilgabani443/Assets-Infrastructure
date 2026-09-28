import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../utils/leafletConfig'; // Leaflet Vite marker fix
import {
  Boxes,
  ArrowLeft,
  Save,
  Upload,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle,
  LocateFixed,
  Image as ImageIcon,
  Sparkles,
  X
} from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Checkbox,
  Badge,
  Spinner
} from '../../components/ui';
import { LIFECYCLE_STAGES } from '../../utils';

const STATUS_CHOICES = [
  { value: 'operational', label: 'Operational' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'failed', label: 'Failed' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'decommissioned', label: 'Decommissioned' },
  { value: 'reserved', label: 'Reserved' }
];

// Helper Leaflet Map Component to handle map clicks and pan updates
function LocationMapPicker({ position, onPositionChange }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    }
  });

  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position && position[0] && position[1] ? (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          onPositionChange(pos.lat, pos.lng);
        }
      }}
    />
  ) : null;
}

export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Main Form Data State
  const [formData, setFormData] = useState({
    name: '',
    assetTag: '',
    category: '',
    subcategory: '',
    status: 'operational',
    lifecycleStage: 'Planned',
    department: '',
    cost: '',
    expectedLifespanYears: '',
    purchaseDate: '',
    installationDate: '',
    warrantyExpiry: '',
    address: '',
    lat: '',
    lng: '',
    imageUrl: '',
    customFields: {}
  });

  // Selected Category Object with dynamic field definitions
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c._id === formData.category);
  }, [categories, formData.category]);

  // Fetch Categories & Initial Asset Data
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingInitial(true);
        const catRes = await api.get('/categories');
        if (catRes.data?.success && catRes.data?.data) {
          setCategories(catRes.data.data);
        }

        if (isEdit) {
          const assetRes = await api.get(`/assets/${id}`);
          if (assetRes.data?.success && assetRes.data?.data) {
            const a = assetRes.data.data;
            setFormData({
              name: a.name || '',
              assetTag: a.assetTag || '',
              category: a.category?._id || a.category || '',
              subcategory: a.subcategory || '',
              status: a.status || 'operational',
              lifecycleStage: a.lifecycleStage || 'Planned',
              department: a.department || '',
              cost: a.cost !== undefined ? a.cost : '',
              expectedLifespanYears: a.expectedLifespanYears || '',
              purchaseDate: a.purchaseDate ? a.purchaseDate.slice(0, 10) : '',
              installationDate: a.installationDate ? a.installationDate.slice(0, 10) : '',
              warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.slice(0, 10) : '',
              address: a.location?.address || '',
              lat: a.location?.lat !== undefined ? a.location.lat : '',
              lng: a.location?.lng !== undefined ? a.location.lng : '',
              imageUrl: a.imageUrl || '',
              customFields: a.customFields || {}
            });
            if (a.imageUrl) {
              setImagePreview(a.imageUrl);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load asset form data:', err);
        toast.error('Failed to load form details');
      } finally {
        setLoadingInitial(false);
      }
    };

    init();
  }, [id, isEdit]);

  // Handle Category Change - retain valid dynamic keys, remove obsolete ones
  const handleCategoryChange = (newCatId) => {
    const newCat = categories.find((c) => c._id === newCatId);
    const validKeys = new Set(newCat?.fieldDefinitions?.map((f) => f.name) || []);

    const updatedCustomFields = {};
    Object.entries(formData.customFields).forEach(([k, v]) => {
      if (validKeys.has(k)) {
        updatedCustomFields[k] = v;
      }
    });

    setFormData((prev) => ({
      ...prev,
      category: newCatId,
      customFields: updatedCustomFields
    }));

    if (formErrors.category) {
      setFormErrors((prev) => ({ ...prev, category: null }));
    }
  };

  // Handle dynamic custom field updates
  const handleCustomFieldChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value
      }
    }));
    if (formErrors[`customFields.${fieldName}`]) {
      setFormErrors((prev) => ({ ...prev, [`customFields.${fieldName}`]: null }));
    }
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (file) => {
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadError('');

    try {
      setUploadingImage(true);
      const data = new FormData();
      data.append('image', file);

      const res = await api.post('/uploads/image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && (res.data.url || res.data.data?.url)) {
        const uploadedUrl = res.data.url || res.data.data.url;
        setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
        toast.success('Photo uploaded to cloud storage');
      }
    } catch (err) {
      console.warn('Image upload error:', err);
      if (err.response?.status === 503) {
        setUploadError(
          'Cloud storage is currently unavailable. You can enter an image URL directly or continue without uploading.'
        );
      } else {
        setUploadError(
          err.response?.data?.message || 'Failed to upload photo. Please check the image format and size.'
        );
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // Geolocation: "Use My Current Location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setFormData((prev) => ({
          ...prev,
          lat,
          lng
        }));
        toast.success(`Location set: ${lat}, ${lng}`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        toast.error('Could not retrieve current GPS coordinates');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Client Validation
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Asset name is required';
    }

    if (!formData.category) {
      errors.category = 'Please select an asset category';
    }

    if (formData.cost !== '' && (isNaN(formData.cost) || Number(formData.cost) < 0)) {
      errors.cost = 'Cost must be a valid positive number';
    }

    if (
      formData.expectedLifespanYears !== '' &&
      (isNaN(formData.expectedLifespanYears) || Number(formData.expectedLifespanYears) < 0)
    ) {
      errors.expectedLifespanYears = 'Lifespan must be a positive integer';
    }

    // Dynamic field validation
    if (selectedCategoryObj?.fieldDefinitions) {
      selectedCategoryObj.fieldDefinitions.forEach((f) => {
        if (f.required) {
          const val = formData.customFields[f.name];
          if (val === undefined || val === null || val === '') {
            errors[`customFields.${f.name}`] = `${f.label || f.name} is required`;
          }
        }
      });
    }

    return errors;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      toast.error('Please resolve the highlighted form errors');
      return;
    }

    // Prepare payload
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      subcategory: formData.subcategory.trim() || undefined,
      status: formData.status,
      department: formData.department.trim() || undefined,
      cost: formData.cost !== '' ? parseFloat(formData.cost) : 0,
      expectedLifespanYears:
        formData.expectedLifespanYears !== ''
          ? parseInt(formData.expectedLifespanYears, 10)
          : undefined,
      purchaseDate: formData.purchaseDate || undefined,
      installationDate: formData.installationDate || undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined,
      imageUrl: formData.imageUrl || undefined,
      customFields: formData.customFields
    };

    if (!isEdit) {
      payload.lifecycleStage = formData.lifecycleStage;
      if (formData.assetTag?.trim()) {
        payload.assetTag = formData.assetTag.trim();
      }
    }

    // Location object
    const latNum = parseFloat(formData.lat);
    const lngNum = parseFloat(formData.lng);
    if (formData.address || (!isNaN(latNum) && !isNaN(lngNum))) {
      payload.location = {
        address: formData.address || undefined,
        lat: !isNaN(latNum) ? latNum : undefined,
        lng: !isNaN(lngNum) ? lngNum : undefined
      };
    }

    try {
      setSubmitting(true);

      let res;
      if (isEdit) {
        res = await api.put(`/assets/${id}`, payload);
      } else {
        res = await api.post('/assets', payload);
      }

      if (res.data?.success && res.data?.data) {
        const savedAsset = res.data.data;
        toast.success(isEdit ? 'Asset updated successfully' : 'Asset created successfully');
        navigate(`/assets/${savedAsset._id}`);
      } else {
        throw new Error(res.data?.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Save asset error:', err);
      // Map server field errors if provided
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const mappedErrors = {};
        err.response.data.errors.forEach((e) => {
          if (e.path || e.field) {
            mappedErrors[e.path || e.field] = e.msg || e.message;
          }
        });
        setFormErrors(mappedErrors);
        toast.error('Validation failed. Please review errors on the form.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to save asset');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Spinner size="lg" text="Loading asset editor..." />
      </div>
    );
  }

  const mapCenter = [
    formData.lat ? parseFloat(formData.lat) : 19.076,
    formData.lng ? parseFloat(formData.lng) : 72.8777
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <PageHeader
        title={isEdit ? `Edit Asset: ${formData.assetTag || formData.name}` : 'New Infrastructure Asset'}
        subtitle={
          isEdit
            ? 'Modify asset specifications, location, and lifecycle metadata.'
            : 'Register a new infrastructure component into the municipal management system.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to={isEdit ? `/assets/${id}` : '/assets'}>
              <Button variant="outline" icon={ArrowLeft} size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              variant="primary"
              icon={Save}
              size="sm"
              loading={submitting}
              onClick={handleSubmit}
            >
              {isEdit ? 'Save Changes' : 'Create Asset'}
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: BASIC INFORMATION */}
        <Card title="1. Basic Information" subtitle="Asset identity, tags, and organizational department">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Asset Name"
              required
              placeholder="e.g. 33kV Step-Down Transformer Substation B"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: null });
              }}
              error={formErrors.name}
            />

            <Input
              label="Asset Tag"
              placeholder={isEdit ? formData.assetTag : 'Auto-generated if left blank (e.g. AST-0012)'}
              value={formData.assetTag}
              disabled={isEdit}
              helper={isEdit ? 'Asset tags are unique and immutable system identifiers' : 'Optional. AST-xxxx auto-assigned if blank'}
              onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
              error={formErrors.assetTag}
            />

            <Select
              label="Operational Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {STATUS_CHOICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>

            <Select
              label="Lifecycle Stage"
              value={formData.lifecycleStage}
              disabled={isEdit}
              helperText={isEdit ? 'Lifecycle transitions are recorded from the asset details page with audit remarks' : ''}
              onChange={(e) => setFormData({ ...formData, lifecycleStage: e.target.value })}
            >
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            <Input
              label="Subcategory"
              placeholder="e.g. Distribution Transformer, Fiber Node, Streetlight"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
            />

            <Input
              label="Department / Directorate"
              placeholder="e.g. Power Grid, Public Works, IT Operations"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
        </Card>

        {/* SECTION 2: CATEGORY & DYNAMIC FIELDS */}
        <Card
          title="2. Category & Dynamic Specifications"
          subtitle="Select a category to dynamically load and configure specialized technical attributes"
        >
          <div className="space-y-6">
            <div className="max-w-md">
              <Select
                label="Infrastructure Category"
                required
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                error={formErrors.category}
              >
                <option value="">-- Choose Category --</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Dynamic Custom Fields Box */}
            {selectedCategoryObj ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span>Technical Schema: {selectedCategoryObj.name}</span>
                </div>

                {selectedCategoryObj.fieldDefinitions?.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    No custom specifications defined for this category.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCategoryObj.fieldDefinitions.map((field) => {
                      const fieldKey = field.name;
                      const fieldVal = formData.customFields[fieldKey] ?? '';
                      const fieldError = formErrors[`customFields.${fieldKey}`];

                      // 1. Text input
                      if (field.type === 'text') {
                        return (
                          <Input
                            key={fieldKey}
                            label={`${field.label || fieldKey}${field.unit ? ` (${field.unit})` : ''}`}
                            required={field.required}
                            value={fieldVal}
                            onChange={(e) => handleCustomFieldChange(fieldKey, e.target.value)}
                            error={fieldError}
                            placeholder={field.unit ? `e.g. 100 ${field.unit}` : ''}
                          />
                        );
                      }

                      // 2. Number input
                      if (field.type === 'number') {
                        return (
                          <Input
                            key={fieldKey}
                            type="number"
                            step="any"
                            label={`${field.label || fieldKey}${field.unit ? ` (${field.unit})` : ''}`}
                            required={field.required}
                            value={fieldVal}
                            onChange={(e) =>
                              handleCustomFieldChange(
                                fieldKey,
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            error={fieldError}
                            placeholder={field.unit ? `Value in ${field.unit}` : '0'}
                          />
                        );
                      }

                      // 3. Date input
                      if (field.type === 'date') {
                        return (
                          <Input
                            key={fieldKey}
                            type="date"
                            label={field.label || fieldKey}
                            required={field.required}
                            value={fieldVal ? String(fieldVal).slice(0, 10) : ''}
                            onChange={(e) => handleCustomFieldChange(fieldKey, e.target.value)}
                            error={fieldError}
                          />
                        );
                      }

                      // 4. Select input
                      if (field.type === 'select') {
                        return (
                          <Select
                            key={fieldKey}
                            label={field.label || fieldKey}
                            required={field.required}
                            value={fieldVal}
                            onChange={(e) => handleCustomFieldChange(fieldKey, e.target.value)}
                            error={fieldError}
                          >
                            <option value="">Select option</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </Select>
                        );
                      }

                      // 5. Boolean checkbox
                      if (field.type === 'boolean') {
                        return (
                          <div key={fieldKey} className="flex items-center pt-6">
                            <Checkbox
                              label={field.label || fieldKey}
                              checked={Boolean(fieldVal)}
                              onChange={(e) => handleCustomFieldChange(fieldKey, e.target.checked)}
                            />
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                Select an infrastructure category above to load its schema attributes.
              </div>
            )}
          </div>
        </Card>

        {/* SECTION 3: LOCATION & GIS PICKER */}
        <Card
          title="3. Location & GIS Coordinates"
          subtitle="Physical street address and interactive GPS coordinate placement"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Input
                  label="Physical Address / Landmark"
                  placeholder="e.g. Substation 4, Sector 7, MG Road"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <Input
                label="Latitude"
                type="number"
                step="any"
                placeholder="19.0760"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                placeholder="72.8777"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Click anywhere on the map or drag the pin to set precise coordinates.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={LocateFixed}
                onClick={handleUseCurrentLocation}
              >
                Use My Current Location
              </Button>
            </div>

            {/* React Leaflet Mini Map Picker */}
            <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-200 z-10 relative">
              <MapContainer
                center={mapCenter}
                zoom={formData.lat && formData.lng ? 14 : 10}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMapPicker
                  position={formData.lat && formData.lng ? [formData.lat, formData.lng] : null}
                  onPositionChange={(newLat, newLng) => {
                    setFormData((prev) => ({
                      ...prev,
                      lat: parseFloat(newLat.toFixed(6)),
                      lng: parseFloat(newLng.toFixed(6))
                    }));
                  }}
                />
              </MapContainer>
            </div>
          </div>
        </Card>

        {/* SECTION 4: DATES, WARRANTY & COST */}
        <Card
          title="4. Valuation, Lifespan & Dates"
          subtitle="Financial acquisition costs, engineered life expectancy, and service milestones"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Purchase / Replacement Cost (₹ INR)"
              type="number"
              step="any"
              placeholder="e.g. 450000"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              error={formErrors.cost}
            />

            <Input
              label="Expected Lifespan (Years)"
              type="number"
              placeholder="e.g. 15"
              value={formData.expectedLifespanYears}
              onChange={(e) => setFormData({ ...formData, expectedLifespanYears: e.target.value })}
              error={formErrors.expectedLifespanYears}
            />

            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />

            <Input
              label="Installation Date"
              type="date"
              value={formData.installationDate}
              onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
            />

            <Input
              label="Warranty Expiry Date"
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
            />
          </div>
        </Card>

        {/* SECTION 5: PHOTO UPLOAD */}
        <Card
          title="5. Asset Photo & Visual Media"
          subtitle="Upload an equipment photo or provide a secure image URL"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview Thumbnail */}
              {imagePreview ? (
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 group">
                  <img
                    src={imagePreview}
                    alt="Asset preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                      setFormData((prev) => ({ ...prev, imageUrl: '' }));
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-slate-50 flex-shrink-0">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-[11px]">No photo</span>
                </div>
              )}

              {/* Upload Input & Fallback URL */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="asset-photo-input"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                  <label htmlFor="asset-photo-input">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      loading={uploadingImage}
                      onClick={() => document.getElementById('asset-photo-input')?.click()}
                    >
                      {uploadingImage ? 'Uploading to Cloud...' : 'Upload Image File'}
                    </Button>
                  </label>
                  <span className="text-xs text-slate-400">JPEG, PNG, WEBP max 5MB</span>
                </div>

                <Input
                  label="Or Direct Image URL"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Upload Error / 503 Notice */}
            {uploadError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </Card>

        {/* BOTTOM ACTION BAR */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link to={isEdit ? `/assets/${id}` : '/assets'}>
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            loading={submitting}
          >
            {isEdit ? 'Update Asset' : 'Save Asset to Registry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
