import React from 'react';
import Spinner from './Spinner';

export const Table = ({
  columns = [],
  data = [],
  keyExtractor = (item, index) => item._id || item.id || index,
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Try refining your filters or search keywords.',
  onRowClick = null,
  className = '',
}) => {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs ${className}`}>
      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-4 py-3.5 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.headerClassName || ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <Spinner size="lg" label="Loading data..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
                    {emptySubtext && <p className="text-xs text-slate-400 mt-1">{emptySubtext}</p>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item, index)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors duration-150 ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      className={`px-4 py-3.5 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(item, index) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
