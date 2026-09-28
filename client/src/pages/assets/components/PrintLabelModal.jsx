import React, { useRef } from 'react';
import { Download, Printer, QrCode as QrIcon } from 'lucide-react';
import { Modal, Button } from '../../../components/ui';
import { formatDate } from '../../../utils';

export default function PrintLabelModal({ isOpen, onClose, asset, qrCodeUrl }) {
  const labelRef = useRef(null);

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR-${asset?.assetTag || 'asset'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printContent = labelRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=650,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label - ${asset?.assetTag}</title>
          <style>
            @page {
              size: 4in 3in;
              margin: 0.15in;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 10px;
              color: #0f172a;
              background: #fff;
            }
            .label-card {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 12px;
              display: flex;
              flex-direction: column;
              height: 90%;
              box-sizing: border-box;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 6px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .tag {
              font-family: monospace;
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .org {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #475569;
            }
            .body {
              display: flex;
              gap: 12px;
              align-items: center;
              flex: 1;
            }
            .qr-img {
              width: 110px;
              height: 110px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
            }
            .info {
              flex: 1;
              font-size: 11px;
              line-height: 1.4;
            }
            .name {
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 4px;
              line-height: 1.2;
            }
            .field-row {
              margin-bottom: 2px;
              color: #334155;
            }
            .field-label {
              font-weight: 600;
              color: #64748b;
            }
            .footer {
              margin-top: auto;
              border-top: 1px dashed #cbd5e1;
              padding-top: 4px;
              font-size: 9px;
              color: #64748b;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header">
              <span class="tag">${asset?.assetTag || 'AST-0000'}</span>
              <span class="org">InfraAsset Inventory</span>
            </div>
            <div class="body">
              ${qrCodeUrl ? `<img src="${qrCodeUrl}" class="qr-img" alt="QR" />` : ''}
              <div class="info">
                <div class="name">${asset?.name || ''}</div>
                <div class="field-row"><span class="field-label">Category:</span> ${asset?.category?.name || 'General'}</div>
                ${asset?.subcategory ? `<div class="field-row"><span class="field-label">Subcategory:</span> ${asset.subcategory}</div>` : ''}
                ${asset?.department ? `<div class="field-row"><span class="field-label">Dept:</span> ${asset.department}</div>` : ''}
                ${asset?.installationDate ? `<div class="field-row"><span class="field-label">Installed:</span> ${new Date(asset.installationDate).toLocaleDateString()}</div>` : ''}
              </div>
            </div>
            <div class="footer">
              <span>Scan QR to view maintenance history</span>
              <span>Official Property</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asset Equipment QR & Label" size="md">
      <div className="space-y-6">
        {/* Printable Label Preview Container */}
        <div
          ref={labelRef}
          className="border-2 border-slate-800 bg-white rounded-2xl p-5 shadow-sm text-slate-800 space-y-4"
        >
          {/* Label Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                Infrastructure Asset
              </span>
              <span className="font-mono text-xl font-extrabold text-slate-900 tracking-wide">
                {asset?.assetTag}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">
                InfraAsset
              </span>
            </div>
          </div>

          {/* Label Middle: QR & Details */}
          <div className="flex items-center gap-5">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR code for ${asset?.assetTag}`}
                className="w-28 h-28 border border-slate-200 rounded-xl p-1 bg-white shadow-2xs flex-shrink-0"
              />
            ) : (
              <div className="w-28 h-28 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400">
                <QrIcon className="w-8 h-8" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1 text-xs">
              <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                {asset?.name}
              </h4>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-500">Category:</span>{' '}
                {asset?.category?.name || 'General'}
              </p>
              {asset?.subcategory && (
                <p className="text-slate-600 truncate">
                  <span className="font-semibold text-slate-500">Subcategory:</span>{' '}
                  {asset.subcategory}
                </p>
              )}
              {asset?.department && (
                <p className="text-slate-600 truncate">
                  <span className="font-semibold text-slate-500">Dept:</span> {asset.department}
                </p>
              )}
              {asset?.installationDate && (
                <p className="text-slate-500 text-[11px]">
                  Installed: {formatDate(asset.installationDate)}
                </p>
              )}
            </div>
          </div>

          {/* Label Footer */}
          <div className="border-t border-dashed border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>Scan QR for field inspection & logs</span>
            <span className="font-semibold text-slate-700">Official Tag</span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            icon={Download}
            onClick={handleDownloadQr}
            size="sm"
          >
            Download PNG
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={Printer}
              onClick={handlePrint}
              size="sm"
            >
              Print Label
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
