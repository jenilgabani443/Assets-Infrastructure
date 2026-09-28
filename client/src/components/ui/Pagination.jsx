import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export const Pagination = ({
  page = 1,
  pages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  className = '',
}) => {
  if (total === 0 || pages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 ${className}`}
    >
      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-700">{total}</span> results
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-2"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="px-3 py-1 text-xs font-medium text-slate-600">
          Page {page} of {pages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="px-2"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
