import React, { useState, useEffect } from 'react';
import { Sale, StoreSettings, PrintFormat } from '../../types';
import { InvoiceThermal80 } from './InvoiceThermal80';
import { InvoiceThermal58 } from './InvoiceThermal58';
import { InvoiceA4 } from './InvoiceA4';
import { Button } from '../common/Button';
import { toast } from '../../store/toastStore';
import { Printer, FileDown, CheckCircle2, AlertTriangle, RefreshCw, X, FolderOpen, Clock, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  settings: StoreSettings;
  isMandatoryPostSale?: boolean;
}

export const PrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sale,
  settings,
  isMandatoryPostSale = false,
}) => {
  const [printFormat, setPrintFormat] = useState<PrintFormat>(settings.default_print_format || 'thermal_80');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPDF, setIsSavingPDF] = useState(false);
  const [savedPdfPath, setSavedPdfPath] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<'idle' | 'success' | 'failed'>(
    sale.print_status === 'printed' ? 'success' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [printers, setPrinters] = useState<{ name: string; displayName?: string }[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(''); // Default: empty string indicates Native Windows Print Dialog

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getPrinters().then((list: any[]) => {
        if (Array.isArray(list)) {
          setPrinters(list);
        }
      }).catch(() => {});
    }
  }, []);

  // Keyboard shortcut support in print modal: Esc to close, F9/Ctrl+P to print, Ctrl+S to save PDF
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'F9' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        handlePrint();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSavePDF();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, printFormat, selectedPrinter]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    setErrorMessage(null);

    try {
      if (window.electronAPI) {
        // Direct print only if a physical printer is explicitly selected; otherwise native Windows print dialog
        const isDirect = Boolean(selectedPrinter && selectedPrinter !== 'Default Windows Printer' && selectedPrinter !== 'System Dialog');

        // Trigger native Windows print dialog by default (silent: false, no deviceName)
        const res = await window.electronAPI.printWindow({
          silent: isDirect,
          printBackground: true,
          deviceName: isDirect ? selectedPrinter : undefined,
        });

        if (res.success) {
          setPrintStatus('success');
          await window.electronAPI.updatePrintStatus({
            saleId: sale.id,
            status: 'printed',
            printType: printFormat,
          });
          toast.success(`Invoice ${sale.invoice_number} sent to printer!`);
        } else if (res.errorType === 'cancelled') {
          // Native Windows print was cancelled by user
          setPrintStatus('idle');
          setErrorMessage('Print operation cancelled by user');
          toast.info('Printing cancelled. Invoice remains safely saved and can be printed at any time.');
        } else {
          setPrintStatus('failed');
          const err = res.errorType || 'Printer unavailable or paper out';
          setErrorMessage(err);
          await window.electronAPI.updatePrintStatus({
            saleId: sale.id,
            status: 'failed',
            errorMessage: err,
            printType: printFormat,
          });
          toast.warning('Printer unavailable. Invoice is safely saved; retry when ready.');
        }
      } else {
        // In browser fallback, trigger window.print()
        window.print();
        setPrintStatus('success');
        toast.success(`Print triggered for ${sale.invoice_number}`);
      }
    } catch (err: any) {
      setPrintStatus('failed');
      setErrorMessage(err.message || 'Printer error occurred');
      if (window.electronAPI) {
        await window.electronAPI.updatePrintStatus({
          saleId: sale.id,
          status: 'failed',
          errorMessage: err.message,
          printType: printFormat,
        });
      }
      toast.error('Print failed. Invoice is preserved in database.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePDF = async () => {
    setIsSavingPDF(true);
    try {
      if (window.electronAPI) {
        const defaultFilename = `Invoice-${sale.invoice_number.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;

        const res = await window.electronAPI.savePDF({
          defaultFilename,
          format: printFormat,
          sale,
          settings,
        });

        if (res.success && res.filePath) {
          setSavedPdfPath(res.filePath);
          toast.success(`PDF exported: ${res.filePath}`);
        } else if (!res.cancelled) {
          toast.error(res.error || 'Failed to export PDF');
        }
      } else {
        toast.info('PDF export is available in desktop application mode.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error exporting PDF');
    } finally {
      setIsSavingPDF(false);
    }
  };

  const handleOpenPDF = async () => {
    if (savedPdfPath && window.electronAPI) {
      const res = await window.electronAPI.openPath(savedPdfPath);
      if (!res.success) {
        toast.error(res.error || 'Could not open PDF file.');
      }
    }
  };

  const handleShowInFolder = async () => {
    if (savedPdfPath && window.electronAPI) {
      const res = await window.electronAPI.showItemInFolder(savedPdfPath);
      if (!res.success) {
        toast.error(res.error || 'Could not locate file in folder.');
      }
    }
  };

  const handleSimulateSuccessfulPrint = async () => {
    setIsPrinting(true);
    setTimeout(async () => {
      setPrintStatus('success');
      setIsPrinting(false);
      if (window.electronAPI) {
        await window.electronAPI.updatePrintStatus({
          saleId: sale.id,
          status: 'printed',
          printType: printFormat,
        });
      }
      toast.success(`Bill marked as printed for ${sale.invoice_number}`);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FFFFFF] dark:bg-[#18212B] rounded-2xl shadow-2xl border border-[#D1D5DB] dark:border-[#374151] flex flex-col max-h-[92vh] w-full max-w-4xl overflow-hidden">
        {/* Header Strip */}
        <div className="px-6 py-4 border-b border-[#D1D5DB] dark:border-[#374151] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#141C24]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#123F7A]/10 text-[#123F7A] dark:bg-[#6EA8FE]/20 dark:text-[#6EA8FE] flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {isMandatoryPostSale ? 'Finalize & Mandatory Bill Print' : 'Bill Print & Receipt Preview'}
                </h2>
                {printStatus === 'success' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#166534] bg-[#EDF7EE] dark:bg-[#1A2E20] dark:text-[#86EFAC] px-2.5 py-0.5 rounded-full border border-[#166534]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Printed ({sale.print_count || 1})
                  </span>
                ) : printStatus === 'failed' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#991B1B] bg-[#FEF2F2] dark:bg-[#2E1414] dark:text-[#FCA5A5] px-2.5 py-0.5 rounded-full border border-[#991B1B]/20">
                    <AlertTriangle className="w-3.5 h-3.5" /> Print Pending / Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-bold text-[#9A3412] bg-[#FFF7ED] dark:bg-[#32230B] dark:text-[#FDE68A] px-2.5 py-0.5 rounded-full border border-[#9A3412]/20">
                    Pending Print
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700 dark:text-slate-300 mt-0.5 font-medium">
                Invoice: <strong className="font-bold text-[#111827] dark:text-[#F9FAFB]">{sale.invoice_number}</strong> • Amount: <strong>₹{sale.grand_total.toFixed(2)}</strong> • Customer: <strong>{sale.customer_name}</strong>
              </p>
            </div>
          </div>

          {/* Format Selector Pills */}
          <div className="flex items-center gap-1 bg-[#E2E8F0] dark:bg-[#202A35] p-1 rounded-lg">
            <button
              onClick={() => setPrintFormat('thermal_80')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                printFormat === 'thermal_80'
                  ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              80mm Thermal
            </button>
            <button
              onClick={() => setPrintFormat('thermal_58')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                printFormat === 'thermal_58'
                  ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              58mm Thermal
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                printFormat === 'a4'
                  ? 'bg-white dark:bg-[#18212B] text-[#123F7A] dark:text-[#6EA8FE] shadow-xs'
                  : 'text-gray-700 dark:text-slate-300 hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              A4 GST Invoice
            </button>
          </div>
        </div>

        {/* Saved PDF Alert Banner */}
        {savedPdfPath && (
          <div className="bg-[#EDF7EE] dark:bg-[#1A2E20] border-b border-[#2D6A4F]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[#166534] dark:text-[#86EFAC]">
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                PDF successfully saved: <strong className="font-semibold">{savedPdfPath}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <button
                onClick={handleOpenPDF}
                className="font-bold underline hover:no-underline flex items-center gap-1 cursor-pointer text-[#123F7A] dark:text-[#6EA8FE]"
              >
                <FileText className="w-3.5 h-3.5" /> Open PDF
              </button>
              <button
                onClick={handleShowInFolder}
                className="font-bold underline hover:no-underline flex items-center gap-1 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Show in Folder
              </button>
            </div>
          </div>
        )}

        {/* Printer Error Warning Banner */}
        {printStatus === 'failed' && (
          <div className="bg-[#FEF2F2] dark:bg-[#2E1414] border-b border-[#DC2626]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[#991B1B] dark:text-[#FCA5A5]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Printer Notice:</strong> {errorMessage || 'Could not reach physical printer.'} Transaction was saved safely in SQLite.
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="font-bold underline hover:no-underline ml-4 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Print Now
            </button>
          </div>
        )}

        {/* Document Preview Surface */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F1F5F9] dark:bg-[#0F172A] flex justify-center items-start">
          <div id="printable-invoice" className="shadow-lg rounded-sm overflow-hidden bg-white">
            {printFormat === 'thermal_80' && <InvoiceThermal80 sale={sale} settings={settings} />}
            {printFormat === 'thermal_58' && <InvoiceThermal58 sale={sale} settings={settings} />}
            {printFormat === 'a4' && <InvoiceA4 sale={sale} settings={settings} />}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white dark:bg-[#18212B] border-t border-[#D1D5DB] dark:border-[#374151] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300">
            <span className="font-semibold">Target Printer:</span>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-[#D1D5DB] dark:border-[#374151] bg-[#F8FAFC] dark:bg-[#151D26] text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#123F7A]"
            >
              <option value="">Native Windows Print Dialog (Ctrl+P / Recommended)</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  Direct Print: {p.displayName || p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Separate Save PDF Button */}
            <Button
              variant="outline"
              size="md"
              isLoading={isSavingPDF}
              onClick={handleSavePDF}
              icon={<FileDown className="w-4 h-4 text-[#123F7A] dark:text-[#6EA8FE]" />}
            >
              <span>Save PDF</span>
              <kbd className="text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-1 py-0.2 rounded font-mono ml-1">^S</kbd>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleSimulateSuccessfulPrint}
              icon={<CheckCircle2 className="w-4 h-4 text-[#166534]" />}
            >
              Mark Printed
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              icon={<X className="w-4 h-4" />}
            >
              <span>{isMandatoryPostSale ? 'Complete & Close' : 'Close'}</span>
              <kbd className="text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-1 py-0.2 rounded font-mono ml-1">Esc</kbd>
            </Button>

            <Button
              variant="primary"
              size="md"
              isLoading={isPrinting}
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
            >
              <span>{printStatus === 'failed' ? 'Retry Print' : 'Print Bill'}</span>
              <kbd className="text-[10px] bg-white/20 px-1 rounded ml-1 font-mono">F9</kbd>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
