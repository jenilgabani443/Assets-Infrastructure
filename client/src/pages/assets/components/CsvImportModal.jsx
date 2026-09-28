import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Download,
  X,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { Modal, Button, Badge } from '../../../components/ui';
import { useToast } from '../../../context/ToastContext';
import api from '../../../api/axios';

export default function CsvImportModal({ isOpen, onClose, onImportSuccess, categories = [] }) {
  const { toast } = useToast();

  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const resetState = () => {
    setFile(null);
    setParsing(false);
    setValidating(false);
    setImporting(false);
    setDryRunResult(null);
    setParsedRows([]);
    setErrorMsg('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Generate and download a sample CSV template
  const handleDownloadTemplate = () => {
    const headers = [
      'name',
      'category',
      'subcategory',
      'status',
      'lifecycleStage',
      'department',
      'cost',
      'expectedLifespanYears',
      'installationDate',
      'purchaseDate',
      'warrantyExpiry',
      'address',
      'lat',
      'lng',
      'cf_voltageKV',
      'cf_capacityKVA',
      'cf_surfaceType',
      'cf_laneCount'
    ];

    const sampleRows = [
      [
        'Distribution Transformer Alpha-4',
        categories[1]?.name || 'Utilities',
        'Transformers',
        'operational',
        'In Service',
        'Power Distribution',
        '250000',
        '20',
        '2022-04-10',
        '2022-03-01',
        '2027-04-10',
        'Sector 4 Substation, Downtown',
        '19.0760',
        '72.8777',
        '11',
        '500',
        '',
        ''
      ],
      [
        'MG Road Overpass Bridge',
        categories[0]?.name || 'Civil and Public Works',
        'Bridges',
        'operational',
        'In Service',
        'Public Works',
        '18500000',
        '50',
        '2018-11-15',
        '2017-06-01',
        '2028-11-15',
        'MG Road Junction, North Ward',
        '19.0820',
        '72.8850',
        '',
        '',
        'Asphalt',
        '4'
      ]
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'asset-import-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle CSV file selection and parsing
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('Please select a valid .csv file');
      return;
    }

    setFile(selectedFile);
    setErrorMsg('');
    setParsing(true);
    setDryRunResult(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        setParsing(false);
        if (results.errors.length > 0 && results.data.length === 0) {
          setErrorMsg(`Error parsing CSV: ${results.errors[0]?.message}`);
          return;
        }

        // Map flat columns into structured asset rows
        const formattedRows = results.data.map((row) => {
          const customFields = {};
          const standardFields = {};

          Object.keys(row).forEach((col) => {
            const rawVal = row[col];
            if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') return;

            const trimmedVal = String(rawVal).trim();

            if (col.startsWith('cf_')) {
              const fieldKey = col.replace(/^cf_/, '');
              // Try numeric parsing if it looks numeric
              if (!isNaN(trimmedVal) && trimmedVal !== '') {
                customFields[fieldKey] = Number(trimmedVal);
              } else if (trimmedVal.toLowerCase() === 'true') {
                customFields[fieldKey] = true;
              } else if (trimmedVal.toLowerCase() === 'false') {
                customFields[fieldKey] = false;
              } else {
                customFields[fieldKey] = trimmedVal;
              }
            } else {
              standardFields[col] = trimmedVal;
            }
          });

          // Build location object if lat/lng/address exist
          const location = {};
          if (standardFields.address) location.address = standardFields.address;
          if (standardFields.lat) location.lat = parseFloat(standardFields.lat);
          if (standardFields.lng) location.lng = parseFloat(standardFields.lng);

          return {
            name: standardFields.name || standardFields.Name || '',
            category: standardFields.category || standardFields.Category || '',
            subcategory: standardFields.subcategory || standardFields.Subcategory || '',
            status: standardFields.status || standardFields.Status || 'operational',
            lifecycleStage: standardFields.lifecycleStage || standardFields.LifecycleStage || 'Planned',
            department: standardFields.department || standardFields.Department || '',
            cost: standardFields.cost ? parseFloat(standardFields.cost) : 0,
            expectedLifespanYears: standardFields.expectedLifespanYears
              ? parseInt(standardFields.expectedLifespanYears, 10)
              : 0,
            installationDate: standardFields.installationDate || null,
            purchaseDate: standardFields.purchaseDate || null,
            warrantyExpiry: standardFields.warrantyExpiry || null,
            location: Object.keys(location).length > 0 ? location : undefined,
            customFields
          };
        });

        setParsedRows(formattedRows);
        // Automatically trigger dryRun validation
        runDryRunValidation(formattedRows);
      },
      error: (err) => {
        setParsing(false);
        setErrorMsg(`Failed to read CSV: ${err.message}`);
      }
    });
  };

  // Perform dryRun validation via API
  const runDryRunValidation = async (rowsToValidate) => {
    try {
      setValidating(true);
      setErrorMsg('');

      const res = await api.post('/assets/import?dryRun=true', {
        rows: rowsToValidate,
        dryRun: true
      });

      if (res.data?.success && res.data?.data) {
        setDryRunResult(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Dry run validation failed');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Validation request failed');
    } finally {
      setValidating(false);
    }
  };

  // Confirm and perform actual import
  const handleFinalImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    try {
      setImporting(true);
      setErrorMsg('');

      const res = await api.post('/assets/import?dryRun=false', {
        rows: parsedRows,
        dryRun: false
      });

      if (res.data?.success) {
        const importedCount = res.data.data?.validCount || parsedRows.length;
        toast.success(`Successfully imported ${importedCount} asset(s)`);
        onImportSuccess?.();
        handleClose();
      } else {
        throw new Error(res.data?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Assets from CSV"
      size="xl"
    >
      <div className="space-y-6">
        {/* Step 1: Upload and Template Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">CSV File & Template</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Include dynamic category specifications with <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">cf_fieldKey</code> prefixes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>
        </div>

        {/* File Drop / Select Area */}
        <div className="border-2 border-dashed border-slate-300 hover:border-primary-400 rounded-2xl p-6 text-center transition-colors bg-white">
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {file ? file.name : 'Click to select or drop CSV file'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports CSV with standard headers and cf_* dynamic properties
            </p>
          </label>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Loading spinners for parsing / validation */}
        {(parsing || validating) && (
          <div className="py-8 text-center">
            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              {parsing ? 'Parsing CSV data...' : 'Validating categories & custom schema rules...'}
            </p>
          </div>
        )}

        {/* Step 2: Dry Run Validation Summary & Preview Table */}
        {dryRunResult && !validating && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-xs text-slate-500 font-medium block">Total Rows</span>
                <span className="text-lg font-bold text-slate-800">{dryRunResult.totalProcessed}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-xs text-emerald-600 font-medium block">Ready to Import</span>
                <span className="text-lg font-bold text-emerald-700">{dryRunResult.validCount}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-xs text-rose-600 font-medium block">Row Errors</span>
                <span className="text-lg font-bold text-rose-700">{dryRunResult.failedCount}</span>
              </div>
            </div>

            {/* Failed rows breakdown */}
            {dryRunResult.failedRows?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl max-h-40 overflow-y-auto">
                <h5 className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Validation Issues ({dryRunResult.failedRows.length})</span>
                </h5>
                <div className="space-y-1 text-xs">
                  {dryRunResult.failedRows.map((item, idx) => (
                    <div key={idx} className="text-amber-800 text-[11px]">
                      <span className="font-semibold">Row #{item.row} ({item.data?.name || 'Unnamed'}):</span>{' '}
                      {item.errors?.map((err) => err.message).join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of rows */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Parsed Rows Preview (First 5)
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Lifecycle</th>
                      <th className="px-3 py-2">Cost</th>
                      <th className="px-3 py-2">Custom Fields</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                        <td className="px-3 py-2 text-slate-600">{r.category}</td>
                        <td className="px-3 py-2 text-slate-600">{r.lifecycleStage}</td>
                        <td className="px-3 py-2 text-slate-600">₹{r.cost || 0}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                          {JSON.stringify(r.customFields || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>

          {dryRunResult && dryRunResult.validCount > 0 && (
            <Button
              variant="primary"
              icon={ArrowRight}
              iconPosition="right"
              loading={importing}
              onClick={handleFinalImport}
            >
              Import {dryRunResult.validCount} Asset(s)
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
