import React, { useState, useEffect, useCallback } from 'react';
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Boxes,
  Sparkles,
  Info,
  AlertTriangle,
  HardHat,
  Zap,
  Radio,
  Building2,
  Truck,
  Laptop,
  Box
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Spinner,
  EmptyState,
  ConfirmDialog
} from '../../components/ui';
import CategoryModal from './components/CategoryModal';

// Map icon strings to Lucide components
const ICON_COMPONENTS = {
  HardHat,
  Zap,
  Radio,
  Building2,
  Truck,
  Laptop,
  Box,
  Tags
};

export default function CategoriesPage() {
  const { role } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [assetCounts, setAssetCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = role === 'admin';
  const canManage = role === 'admin' || role === 'manager';

  // Fetch categories and stats to get asset counts per category
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, statsRes] = await Promise.allSettled([
        api.get('/categories'),
        api.get('/dashboard/stats')
      ]);

      if (catRes.status === 'fulfilled' && catRes.value.data?.success) {
        setCategories(catRes.value.data.data || []);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.data?.byCategory) {
        const counts = {};
        statsRes.value.data.data.byCategory.forEach((item) => {
          if (item._id) counts[item._id] = item.count;
        });
        setAssetCounts(counts);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle category deletion
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setDeleting(true);
      const res = await api.delete(`/categories/${categoryToDelete._id}`);
      if (res.data?.success) {
        toast.success(`Category '${categoryToDelete.name}' deleted successfully`);
        fetchData();
      }
    } catch (err) {
      console.error('Delete category error:', err);
      toast.error(
        err.response?.data?.message || 'Cannot delete category while assets are assigned to it'
      );
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    }
  };

  const getCategoryIconComponent = (iconName) => {
    return ICON_COMPONENTS[iconName] || Box;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <PageHeader
        title="Asset Categories & Schemas"
        subtitle="Configure infrastructure domains and define dynamic technical specifications for equipment registry."
        actions={
          canManage && (
            <Button
              variant="primary"
              icon={Plus}
              size="sm"
              onClick={() => {
                setSelectedCategory(null);
                setModalOpen(true);
              }}
            >
              New Category
            </Button>
          )
        }
      />

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" text="Loading categories & dynamic schemas..." />
        </div>
      ) : categories.length === 0 ? (
        <Card className="py-16">
          <EmptyState
            icon={Tags}
            title="No Categories Defined"
            description="Create categories like Civil Works, Utilities, or Telecom to organize your assets."
            action={
              canManage && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setSelectedCategory(null);
                    setModalOpen(true);
                  }}
                >
                  Create Category
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const IconComp = getCategoryIconComponent(cat.icon);
            const count = assetCounts[cat._id] || 0;
            const fieldCount = cat.fieldDefinitions?.length || 0;

            return (
              <Card
                key={cat._id}
                className="flex flex-col justify-between hover:border-slate-300 transition-all p-5 shadow-xs group"
              >
                <div className="space-y-4">
                  {/* Card Header with Icon & Asset Count */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 group-hover:scale-105 transition-transform">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ID: {cat._id.slice(-6)}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      <Boxes className="w-3.5 h-3.5 text-slate-500" />
                      <span>{count} assets</span>
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 min-h-8">
                    {cat.description || 'No domain description provided for this category.'}
                  </p>

                  {/* Dynamic Technical Fields Preview */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary-600" />
                        <span>Technical Attributes ({fieldCount})</span>
                      </span>
                    </div>

                    {fieldCount > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.fieldDefinitions.slice(0, 4).map((f) => (
                          <span
                            key={f.name}
                            className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                          >
                            {f.label || f.name}
                            {f.unit && ` (${f.unit})`}
                          </span>
                        ))}
                        {fieldCount > 4 && (
                          <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-slate-400">
                            +{fieldCount - 4} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Standard specifications only.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setModalOpen(true);
                      }}
                    >
                      Edit Schema
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      icon={Trash2}
                      onClick={() => {
                        setCategoryToDelete(cat);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MODAL */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSuccess={() => fetchData()}
      />

      {/* DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete category "${categoryToDelete?.name}"? Deleting is permanently blocked if assets currently use this category.`}
        confirmText="Delete Category"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
