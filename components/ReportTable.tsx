import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MaintenanceRecord, Category, Status, ReportHeaderInfo } from '../types';
import { CATEGORIES, TOWERS, SHIFTS } from '../constants';
import { Trash2, FileSpreadsheet, Printer, ChevronsUpDown, ClipboardCopy, Check, Square, CheckSquare, Search, Filter, X, Camera, Plus, ArrowDown } from 'lucide-react';

interface ReportTableProps {
  records: MaintenanceRecord[];
  headerInfo: ReportHeaderInfo;
  onUpdate: (id: string, field: keyof MaintenanceRecord, value: any) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

// --- PERFOMANCE OPTIMIZATION: Local State Textarea ---
// This prevents the entire table from re-rendering on every keystroke.
interface AutoResizeTextareaProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  readOnly?: boolean;
}

const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({ value, onChange, className, style, placeholder, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync local value if parent value changes (e.g. from AI or undo)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resize();
  }, [localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    resize();
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
      rows={1}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  );
};

// --- Helper: Image Compression ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Resize to max 800px width
                const scaleSize = MAX_WIDTH / img.width;
                const width = scaleSize < 1 ? MAX_WIDTH : img.width;
                const height = scaleSize < 1 ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const ReportTable: React.FC<ReportTableProps> = ({ records, headerInfo, onUpdate, onDelete, readOnly = false }) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Image Gallery Modal State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentGalleryRecordId, setCurrentGalleryRecordId] = useState<string | null>(null);
  const [currentGalleryImages, setCurrentGalleryImages] = useState<string[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // --- MEMOIZATION FOR PERFORMANCE ---
  // Only re-calculate filters when dependencies change
  const filteredRecords = useMemo(() => {
      return records.filter(record => {
          // Text Search
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            record.description.toLowerCase().includes(searchLower) ||
            record.location.toLowerCase().includes(searchLower) ||
            record.building.toLowerCase().includes(searchLower) ||
            record.executedBy.toLowerCase().includes(searchLower);

          // Dropdown Filters
          const matchesCategory = filterCategory === 'All' || record.category === filterCategory;
          const matchesStatus = filterStatus === 'All' || record.status === filterStatus;

          return matchesSearch && matchesCategory && matchesStatus;
      });
  }, [records, searchTerm, filterCategory, filterStatus]);

  // Group records by category (Using filtered records)
  const groupedRecords = useMemo(() => {
      const groups: Record<string, MaintenanceRecord[]> = {};
      CATEGORIES.forEach(cat => { groups[cat] = []; });
      filteredRecords.forEach(record => {
        if (!groups[record.category]) {
            groups[record.category] = [];
        }
        groups[record.category].push(record);
      });
      return groups;
  }, [filteredRecords]);

  const handlePrint = () => {
    window.print();
  };

  const toggleSelection = (id: string) => {
    if (readOnly) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (readOnly) return;
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilterCategory('All');
      setFilterStatus('All');
  };

  // --- Image Gallery Handlers ---
  const openGallery = (record: MaintenanceRecord) => {
      setCurrentGalleryRecordId(record.id);
      setCurrentGalleryImages(record.images || []);
      setIsGalleryOpen(true);
  };

  const closeGallery = () => {
      setIsGalleryOpen(false);
      setCurrentGalleryRecordId(null);
      setCurrentGalleryImages([]);
  };

  const handleGalleryAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && currentGalleryRecordId) {
           const newImages: string[] = [];
          for (let i = 0; i < e.target.files.length; i++) {
              try {
                const compressed = await compressImage(e.target.files[i]);
                newImages.push(compressed);
              } catch (err) {
                  console.error("Image compression failed", err);
              }
          }
          const updatedImages = [...currentGalleryImages, ...newImages];
          setCurrentGalleryImages(updatedImages);
          onUpdate(currentGalleryRecordId, 'images', updatedImages);
      }
  };

  const handleGalleryDeleteImage = (index: number) => {
      if (currentGalleryRecordId) {
          const updatedImages = currentGalleryImages.filter((_, i) => i !== index);
          setCurrentGalleryImages(updatedImages);
          onUpdate(currentGalleryRecordId, 'images', updatedImages);
      }
  };

  // --- EXCEL GENERATION LOGIC ---
  
  // Helper to split base64 into 76-char lines for MHTML
  const chunkString = (str: string, length: number) => {
    return str.match(new RegExp('.{1,' + length + '}', 'g'));
  };

  const handleDownloadExcel = () => {
    // Excel Colors & Styles
    const headerGreen = '#C6E0B4'; 
    const subHeaderGreen = '#E2EFDA'; 
    const columnHeaderGreen = '#C6E0B4'; 
    const categoryGray = '#f3f4f6';
    const borderColor = '#000000';
    
    // Fonts
    const headerFontFamily = "Calibri, sans-serif";
    const dataFontFamily = "Calibri, sans-serif";
    
    // Borders (THICKER: 1pt)
    const border = `border: 1pt solid ${borderColor};`;

    // 11 Columns total: S/N, Desc, Reason, Parts, Status, Building, Loc, Shift, Exec, Note, Photos
    const colWidths = [40, 450, 150, 150, 90, 100, 100, 70, 120, 150, 120];

    // --- 1. COLLECT IMAGES ---
    const embeddedImages: Array<{ contentId: string, contentType: string, data: string }> = [];
    
    const registerImage = (base64Str: string) => {
        const matches = base64Str.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return null;
        
        const contentType = matches[1];
        const data = matches[2];
        const contentId = `image_${embeddedImages.length}@ufm_report`;
        
        embeddedImages.push({ contentId, contentType, data });
        return `cid:${contentId}`;
    };

    // --- 2. BUILD HTML BODY ---
    let tableBody = '';
    let globalIndex = 1;

    CATEGORIES.forEach(category => {
        const catRecords = groupedRecords[category] || [];
        if (catRecords.length > 0) {
            // Category Header
            tableBody += `
                <tr>
                    <td colspan="11" style="${border} background-color: ${categoryGray}; font-family: ${headerFontFamily}; font-size: 12pt; font-weight: 700; text-transform: uppercase; text-align: center; vertical-align: middle;">
                        ${category}
                    </td>
                </tr>
            `;

            catRecords.forEach(record => {
                const safe = (txt: string) => (txt || '').replace(/(\r\n|\n|\r)/gm, "<br>").trim(); 
                
                // Process Images
                let imgCells = '';
                if (record.images && record.images.length > 0) {
                     record.images.forEach(img => {
                         const cid = registerImage(img);
                         if (cid) {
                             // Resized to 45px with padding to avoid overflow
                             imgCells += `<img src="${cid}" width="45" height="45" style="display:block; margin: 4px auto;" />`;
                         }
                     });
                } else {
                    imgCells = '-';
                }

                tableBody += `
                    <tr>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${globalIndex}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: left; vertical-align: top; padding: 5px;">${safe(record.description)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.reasonOfFailure)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.partsReplaced)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.status)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.building)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.location)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.shift)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: top;">${safe(record.executedBy)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: left; vertical-align: top;">${safe(record.note)}</td>
                        <td style="${border} font-family: ${dataFontFamily}; font-size: 12pt; text-align: center; vertical-align: middle; padding: 10px;">${imgCells}</td>
                    </tr>
                `;
                globalIndex++;
            });
        }
    });

    // --- 3. CONSTRUCT FULL HTML ---
    const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="utf-8" />
        <style>
            table { border-collapse: collapse; table-layout: fixed; width: 100%; }
            th, td { border: 1pt solid #000000; padding: 5px; } 
            br { mso-data-placement:same-cell; }
        </style>
        <!--[if gte mso 9]>
        <xml>
        <x:ExcelWorkbook>
            <x:ExcelWorksheets>
            <x:ExcelWorksheet>
                <x:Name>Daily Report</x:Name>
                <x:WorksheetOptions>
                <x:DisplayGridlines/>
                <x:Print>
                    <x:ValidPrinterInfo/>
                    <x:Scale>70</x:Scale>
                    <x:PaperSizeIndex>9</x:PaperSizeIndex>
                    <x:HorizontalResolution>600</x:HorizontalResolution>
                    <x:VerticalResolution>600</x:VerticalResolution>
                </x:Print>
                <x:PageSetup>
                    <x:Layout x:Orientation="Landscape"/>
                    <x:PageMargins x:Bottom="0.5" x:Left="0.25" x:Right="0.25" x:Top="0.5"/>
                </x:PageSetup>
                <x:FreezePanes>
                    <x:FrozenNoSplit/>
                    <x:SplitHorizontal>6</x:SplitHorizontal>
                    <x:TopRowBottomPane>6</x:TopRowBottomPane>
                    <x:ActivePane>2</x:ActivePane>
                </x:FreezePanes>
                </x:WorksheetOptions>
            </x:ExcelWorksheet>
            </x:ExcelWorksheets>
        </x:ExcelWorkbook>
        </xml>
        <![endif]-->
    </head>
    <body>
    <table>
        ${colWidths.map(w => `<col width="${w}">`).join('')}
        <thead>
            <tr style="height: 50px;">
                <td colspan="2" style="${border} background-color: ${headerGreen}; font-family: ${headerFontFamily}; font-size: 24pt; font-weight: 700; color: #000000; text-align: center; vertical-align: middle;">UFM</td>
                <td colspan="9" style="${border} background-color: ${headerGreen}; font-family: ${headerFontFamily}; text-align: center; vertical-align: middle;">
                    <div style="font-size: 16pt; font-weight: 800; color: #000000;">DAILY MAINTENANCE REPORT</div>
                    <div style="font-size: 12pt; font-weight: 700; margin-top: 4px; color: #000000;">United Facilities Management</div>
                </td>
            </tr>
            <tr style="height: 35px;">
                <td colspan="2" style="${border} background-color: ${subHeaderGreen}; font-family: ${headerFontFamily}; vertical-align: middle;">
                    <span style="font-weight: 700;">Date:</span> ${headerInfo.reportDate}
                </td>
                <td colspan="3" style="${border} background-color: ${subHeaderGreen};"></td>
                <td colspan="6" style="${border} background-color: ${subHeaderGreen}; font-family: ${headerFontFamily}; text-align: center; vertical-align: middle;">
                     <span style="font-weight: 700;">Building:</span> Kipco – City – Shaheed – KBC Parking
                </td>
            </tr>
            <tr style="height: 35px;">
                <td colspan="2" style="${border} background-color: ${subHeaderGreen}; font-family: ${headerFontFamily}; vertical-align: middle;">
                    <span style="font-weight: 700;">Prepared by:</span> ${headerInfo.preparedBy}
                </td>
                <td colspan="3" style="${border} background-color: ${subHeaderGreen}; font-family: ${headerFontFamily}; text-align: center; vertical-align: middle;">
                    <span style="font-weight: 700;">Day Supervisor:</span> ${headerInfo.daySupervisor}
                </td>
                <td colspan="6" style="${border} background-color: ${subHeaderGreen}; font-family: ${headerFontFamily}; text-align: center; vertical-align: middle;">
                    <span style="font-weight: 700;">Night Supervisor:</span> ${headerInfo.nightSupervisor}
                </td>
            </tr>
            <tr style="height: 30px;">
                <td rowspan="2" style="${border} background-color: ${headerGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">S/N</td>
                <td style="${border} background-color: ${headerGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">SYSTEM</td>
                <td colspan="9" style="${border} background-color: ${headerGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">DETAILS</td>
            </tr>
            <tr style="height: 30px;">
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">DESCRIPTION</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Reason / Ticket No.</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Parts Replaced</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Status</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Building</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Location</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Shift</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Executed by</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Note</td>
                <td style="${border} background-color: ${columnHeaderGreen}; font-family: ${headerFontFamily}; font-weight: 700; text-align: center; vertical-align: middle;">Photos</td>
            </tr>
        </thead>
        <tbody>
            ${tableBody}
        </tbody>
    </table>
    </body>
    </html>
    `;

    // --- 4. BUILD MHTML ---
    const boundary = "----=_NextPart_000_0000_01D40F1E.56064C30";
    let mhtml = "";
    
    // MHTML Header
    mhtml += `MIME-Version: 1.0\n`;
    mhtml += `Content-Type: multipart/related; boundary="${boundary}"\n\n`;
    
    // Part 1: HTML
    mhtml += `--${boundary}\n`;
    mhtml += `Content-Type: text/html; charset="UTF-8"\n`;
    mhtml += `Content-Transfer-Encoding: 8bit\n`;
    mhtml += `Content-Location: report.htm\n\n`;
    mhtml += htmlContent + `\n\n`;

    // Part 2...N: Images
    embeddedImages.forEach(img => {
        const chunkedData = chunkString(img.data, 76)?.join('\n');
        mhtml += `--${boundary}\n`;
        mhtml += `Content-Type: ${img.contentType}\n`;
        mhtml += `Content-Transfer-Encoding: base64\n`;
        mhtml += `Content-Location: ${img.contentId}\n`; 
        mhtml += `Content-ID: <${img.contentId}>\n\n`;
        mhtml += chunkedData + `\n\n`;
    });

    mhtml += `--${boundary}--`;

    const blob = new Blob([mhtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UFM_Report_${headerInfo.reportDate.replace(/[\\/]/g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyForExcel = () => {
     alert("Copying with images is limited. Use 'Download Excel' for full image support.");
  };

  return (
    <>
    <div className="bg-white shadow-xl overflow-hidden mb-12 print:shadow-none print:m-0 rounded-xl border border-gray-200">
      
      {/* 1. SEARCH & FILTER TOOLBAR */}
      <div className="p-4 bg-white border-b border-gray-200 print:hidden space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search description, location, building..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                <div className="relative min-w-[120px]">
                    <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full pl-2 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white cursor-pointer focus:border-teal-500 outline-none"
                    >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Filter size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative min-w-[120px]">
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full pl-2 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white cursor-pointer focus:border-teal-500 outline-none"
                    >
                        <option value="All">All Statuses</option>
                        {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronsUpDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {(searchTerm || filterCategory !== 'All' || filterStatus !== 'All') && (
                    <button 
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                    >
                        <X size={16} /> Clear
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* 2. ACTION BAR */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center print:hidden">
         <div className="text-xs text-gray-500 font-medium">
            {selectedIds.size > 0 ? (
                <span className="text-indigo-600 font-bold">{selectedIds.size} rows selected</span>
            ) : (
                <span>Showing {filteredRecords.length} records</span>
            )}
         </div>

         <div className="flex gap-2">
            {!readOnly && (
                <button 
                    onClick={handleCopyForExcel}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                    {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
            )}

            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-sm"
            >
                <Printer size={14} />
                <span>Print</span>
            </button>
            <button 
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-sm border border-emerald-700"
            >
                <FileSpreadsheet size={14} />
                <span>Download Excel</span>
            </button>
        </div>
      </div>

      {/* The Report Frame */}
      <div ref={tableRef} className="p-2 print:p-6 overflow-x-auto bg-white min-h-[600px]">
        <div className="w-full min-w-[1000px] overflow-hidden">
            
            <table className="w-full text-center border-collapse border border-gray-400">
                <thead>
                    {/* Header: Classy Look */}
                    <tr className="bg-[#e2efda]">
                       <th className="print:hidden border-b border-gray-400 bg-white w-8"></th>
                       <th colSpan={2} className="border-r border-b border-gray-400 p-4 w-[25%] bg-white">
                          <div className="flex items-center justify-center">
                            <div className="font-bold text-4xl text-black tracking-tight" style={{ fontFamily: 'Calibri' }}>UFM</div>
                          </div>
                       </th>
                       <th colSpan={9} className="border-b border-gray-400 p-2">
                           <h1 className="text-2xl font-bold text-black uppercase tracking-widest" style={{ fontFamily: 'Calibri' }}>DAILY MAINTENANCE REPORT</h1>
                           <span className="text-base text-black font-bold mt-1 block" style={{ fontFamily: 'Calibri' }}>United Facilities Management</span>
                       </th>
                       <th className="print:hidden border-b border-gray-400 bg-white"></th>
                    </tr>

                    <tr className="bg-[#f0f7eb] text-black text-xs">
                         <th className="print:hidden border-b border-gray-400 bg-[#f0f7eb]"></th>
                        <th colSpan={2} className="border-r border-b border-gray-400 p-2 text-left pl-3">
                             <span className="text-black font-bold uppercase tracking-wider text-[13px] mr-2" style={{ fontFamily: 'Calibri' }}>Date:</span>
                             <span className="font-bold text-black text-[14px]" style={{ fontFamily: 'Calibri' }}>{headerInfo.reportDate}</span>
                        </th>
                        <th colSpan={3} className="border-r border-b border-gray-400 p-2"></th>
                        <th colSpan={6} className="border-b border-gray-400 p-2 text-center">
                             <span className="text-black font-bold uppercase tracking-wider text-[13px] mr-2" style={{ fontFamily: 'Calibri' }}>Building:</span>
                             <span className="font-bold text-black text-[14px]" style={{ fontFamily: 'Calibri' }}>Kipco – City – Shaheed – KBC Parking</span>
                        </th>
                        <th className="print:hidden border-b border-gray-400 bg-[#f0f7eb]"></th>
                    </tr>

                    <tr className="bg-[#f0f7eb] text-black text-xs">
                        <th className="print:hidden border-b border-gray-400 bg-[#f0f7eb]"></th>
                        <th colSpan={2} className="border-r border-b border-gray-400 p-2 text-left pl-3">
                             <span className="text-black font-bold uppercase tracking-wider text-[13px] mr-2" style={{ fontFamily: 'Calibri' }}>Prepared by:</span>
                             <span className="font-bold text-black text-[14px]" style={{ fontFamily: 'Calibri' }}>{headerInfo.preparedBy}</span>
                        </th>
                        <th colSpan={3} className="border-r border-b border-gray-400 p-2 text-center">
                             <span className="text-black font-bold uppercase tracking-wider text-[13px] mr-2" style={{ fontFamily: 'Calibri' }}>Day Supervisor:</span>
                             <span className="font-bold text-black text-[14px]" style={{ fontFamily: 'Calibri' }}>{headerInfo.daySupervisor}</span>
                        </th>
                        <th colSpan={6} className="border-b border-gray-400 p-2 text-center">
                             <span className="text-black font-bold uppercase tracking-wider text-[13px] mr-2" style={{ fontFamily: 'Calibri' }}>Night Supervisor:</span>
                             <span className="font-bold text-black text-[14px]" style={{ fontFamily: 'Calibri' }}>{headerInfo.nightSupervisor}</span>
                        </th>
                        <th className="print:hidden border-b border-gray-400 bg-[#f0f7eb]"></th>
                    </tr>

                    <tr className="bg-[#e2efda] text-black font-bold">
                        <th rowSpan={2} className="border-b border-r border-gray-400 w-8 print:hidden align-middle bg-[#e2efda]">
                           {!readOnly && (
                            <div className="flex justify-center cursor-pointer" onClick={toggleSelectAll}>
                                {selectedIds.size > 0 && selectedIds.size === filteredRecords.length ? (
                                    <CheckSquare size={16} className="text-emerald-700" />
                                ) : (
                                    <Square size={16} className="text-gray-400 hover:text-gray-600" />
                                )}
                            </div>
                           )}
                        </th>
                        <th rowSpan={2} className="border-r border-b border-gray-400 w-12 p-2 align-middle text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>S/N</th>
                        <th className="border-r border-b border-gray-400 p-2 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>SYSTEM</th>
                        <th colSpan={9} className="border-b border-gray-400 p-2 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>DETAILS</th>
                        <th rowSpan={2} className="border-b border-l border-gray-400 w-10 print:hidden bg-[#e2efda]"></th>
                    </tr>
                    <tr className="bg-[#eff7ea] text-black font-bold">
                        <th className="border-r border-b border-gray-400 p-3 text-left pl-4 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>DESCRIPTION</th>
                        <th className="border-r border-b border-gray-400 p-3 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Reason / Ticket No.</th>
                        <th className="border-r border-b border-gray-400 p-3 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Parts Replaced</th>
                        <th className="border-r border-b border-gray-400 p-3 w-32 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Status</th>
                        <th className="border-r border-b border-gray-400 p-3 w-28 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Building</th>
                        <th className="border-r border-b border-gray-400 p-3 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Location</th>
                        <th className="border-r border-b border-gray-400 p-3 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Shift</th>
                        <th className="border-r border-b border-gray-400 p-3 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Executed by</th>
                        <th className="border-r border-b border-gray-400 p-3 text-black font-bold" style={{ fontFamily: 'Calibri', fontSize: '14px' }}>Note</th>
                        <th className="border-b border-gray-400 p-3 w-24 text-black font-bold border-r" style={{ fontFamily: 'Calibri', fontSize: '14px' }}><Camera size={16} className="mx-auto" /></th>
                    </tr>
                </thead>

                <tbody>
                    {CATEGORIES.map((category) => {
                        const catRecords = groupedRecords[category] || [];
                        return (
                            <React.Fragment key={category}>
                                {/* Category Header Row */}
                                <tr className="border-b border-gray-300">
                                    <td className="print:hidden border-b border-gray-300 bg-gray-50"></td>
                                    <td colSpan={13} className="font-bold text-center py-2 bg-gray-50 text-gray-700 tracking-wider uppercase text-[14px] border-t border-gray-300">
                                        {category}
                                    </td>
                                    <td className="print:hidden border-b border-gray-300 bg-gray-50"></td>
                                </tr>
                                
                                {catRecords.length > 0 ? (
                                    catRecords.map((record, index) => {
                                        const isSelected = selectedIds.has(record.id);
                                        const hasImages = record.images && record.images.length > 0;
                                        
                                        return (
                                        <tr key={record.id} className={`border-b border-gray-200 transition-colors text-left group ${isSelected ? 'bg-indigo-50' : 'bg-white hover:bg-blue-50/30'}`}>
                                            
                                            <td className="print:hidden border-r border-gray-300 align-middle text-center">
                                                {!readOnly && (
                                                <div className="flex justify-center cursor-pointer" onClick={() => toggleSelection(record.id)}>
                                                    {isSelected ? (
                                                        <CheckSquare size={16} className="text-indigo-600" />
                                                    ) : (
                                                        <Square size={16} className="text-gray-300 hover:text-gray-400" />
                                                    )}
                                                </div>
                                                )}
                                            </td>

                                            {/* S/N */}
                                            <td className={`border-r border-gray-300 text-center py-2 relative font-medium text-gray-500 align-middle`} style={{ fontFamily: 'Calibri', fontSize: '14px' }}>
                                                {index + 1}
                                            </td>

                                            {/* Description */}
                                            <td className="border-r border-gray-300 px-2 py-2 align-middle font-medium text-gray-800 leading-relaxed">
                                                <AutoResizeTextarea
                                                    value={record.description}
                                                    onChange={(val) => !readOnly && onUpdate(record.id, 'description', val)}
                                                    className={`w-full bg-transparent outline-none rounded p-1 transition-all ${readOnly ? 'cursor-default' : 'focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    readOnly={readOnly}
                                                />
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center text-gray-600">
                                                <AutoResizeTextarea
                                                    value={record.reasonOfFailure}
                                                    onChange={(val) => !readOnly && onUpdate(record.id, 'reasonOfFailure', val)}
                                                    className={`w-full bg-transparent outline-none text-center rounded p-1 transition-all ${readOnly ? 'cursor-default' : 'focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    readOnly={readOnly}
                                                />
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center text-gray-600">
                                                <AutoResizeTextarea
                                                    value={record.partsReplaced}
                                                    onChange={(val) => !readOnly && onUpdate(record.id, 'partsReplaced', val)}
                                                    className={`w-full bg-transparent outline-none text-center rounded p-1 transition-all ${readOnly ? 'cursor-default' : 'focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    readOnly={readOnly}
                                                />
                                            </td>

                                            <td className="border-r border-gray-300 px-2 py-2 align-middle text-center">
                                                <div className="relative w-full flex items-center justify-center">
                                                    <select
                                                        value={record.status}
                                                        onChange={(e) => onUpdate(record.id, 'status', e.target.value)}
                                                        className={`appearance-none w-full bg-transparent text-center font-medium text-gray-700 outline-none py-1 z-10 ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                                                        style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                        disabled={readOnly}
                                                    >
                                                        {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                    {!readOnly && <ChevronsUpDown size={14} className="text-gray-400 absolute right-0 pointer-events-none" />}
                                                </div>
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center">
                                                <div className="relative group/input">
                                                    <select
                                                        value={record.building}
                                                        onChange={(e) => onUpdate(record.id, 'building', e.target.value)}
                                                        className={`appearance-none w-full bg-transparent text-center font-semibold text-gray-600 outline-none border-b border-transparent py-1 transition-all rounded p-1 ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer hover:border-gray-300 focus:border-blue-500'}`}
                                                        style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                        disabled={readOnly}
                                                    >
                                                        {TOWERS.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center text-gray-600">
                                                <AutoResizeTextarea
                                                    value={record.location}
                                                    onChange={(val) => !readOnly && onUpdate(record.id, 'location', val)}
                                                    className={`w-full bg-transparent outline-none text-center rounded p-1 transition-all ${readOnly ? 'cursor-default' : 'focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    readOnly={readOnly}
                                                />
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center text-gray-600">
                                                <select
                                                    value={record.shift}
                                                    onChange={(e) => onUpdate(record.id, 'shift', e.target.value)}
                                                    className={`w-full bg-transparent outline-none text-center rounded p-1 appearance-none transition-all ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    disabled={readOnly}
                                                >
                                                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center text-gray-600">
                                                 <AutoResizeTextarea
                                                    value={record.executedBy}
                                                    onChange={(val) => !readOnly && onUpdate(record.id, 'executedBy', val)}
                                                    className={`w-full bg-transparent outline-none text-center rounded p-1 transition-all ${readOnly ? 'cursor-default' : 'focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    readOnly={readOnly}
                                                />
                                            </td>

                                            <td className="border-r border-gray-300 px-1 py-2 align-middle text-center text-gray-400 italic">
                                                <AutoResizeTextarea
                                                    value={record.note}
                                                    onChange={(val) => !readOnly && onUpdate(record.id, 'note', val)}
                                                    className={`w-full bg-transparent outline-none text-center rounded p-1 transition-all ${readOnly ? 'cursor-default' : 'focus:bg-blue-50/50'}`}
                                                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                                                    readOnly={readOnly}
                                                />
                                            </td>

                                            {/* IMAGE ICON COLUMN */}
                                            <td className="px-1 py-2 align-middle text-center relative group/image border-r border-gray-300">
                                                <div className="flex justify-center items-center gap-1">
                                                {hasImages && (
                                                    <>
                                                        <button 
                                                            onClick={() => openGallery(record)}
                                                            className="text-teal-600 hover:text-teal-800 transition-colors bg-teal-50 hover:bg-teal-100 p-1.5 rounded-full"
                                                            title="View Images"
                                                        >
                                                            <Camera size={16} fill="currentColor" className="opacity-80" />
                                                        </button>
                                                        <a 
                                                            href={record.images![0]} 
                                                            download={`ufm-image-${record.id}.jpg`}
                                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-full transition-colors"
                                                            title="Download Image"
                                                        >
                                                            <ArrowDown size={16} />
                                                        </a>
                                                    </>
                                                )}
                                                {!hasImages && !readOnly && (
                                                     <button 
                                                        onClick={() => openGallery(record)}
                                                        className="text-gray-300 hover:text-teal-600 transition-colors p-1 rounded-full opacity-50 hover:opacity-100"
                                                        title="Add Image"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                                </div>
                                            </td>
                                            
                                            <td className="border-l border-gray-300 px-2 py-2 align-middle text-center print:hidden">
                                                {!readOnly && (
                                                <button 
                                                    onClick={() => onDelete(record.id)}
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"
                                                    title="Delete Row"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                )}
                                            </td>
                                        </tr>
                                    )})
                                ) : (
                                    <tr className="border-b border-gray-100 h-12 bg-white">
                                        <td className="print:hidden border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100 text-gray-300 italic px-4 text-[13px]">
                                            {(searchTerm || filterCategory !== 'All' || filterStatus !== 'All') 
                                                ? 'No matching records found' 
                                                : 'No records...'}
                                        </td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="border-r border-gray-100"></td>
                                        <td className="print:hidden border-l border-gray-100"></td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
            
        </div>
      </div>
    </div>

      {/* --- IMAGE GALLERY MODAL --- */}
      {isGalleryOpen && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <Camera className="text-teal-600" /> Attached Images
                      </h3>
                      <button onClick={closeGallery} className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 p-2 rounded-full">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                      {currentGalleryImages.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {currentGalleryImages.map((img, idx) => (
                                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-white aspect-square">
                                      <img src={img} alt={`Attachment ${idx}`} className="w-full h-full object-contain" />
                                      {!readOnly && (
                                          <button 
                                            onClick={() => handleGalleryDeleteImage(idx)}
                                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                            title="Delete Image"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      )}
                                      <a href={img} download={`image-${idx}.jpg`} className="absolute bottom-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-80 hover:opacity-100 hover:bg-black/80 transition-all">
                                           <ArrowDown size={20} className="text-white" />
                                      </a>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                              <Camera size={48} className="mb-2 opacity-20" />
                              <p>No images attached.</p>
                          </div>
                      )}
                  </div>

                  {/* Footer - Add Image */}
                  {!readOnly && (
                      <div className="p-4 border-t border-gray-200 bg-white">
                          <button 
                            onClick={() => galleryInputRef.current?.click()}
                            className="w-full border-2 border-dashed border-gray-300 hover:border-teal-500 hover:bg-teal-50 text-gray-500 hover:text-teal-600 rounded-lg p-4 transition-all flex items-center justify-center gap-2 font-bold"
                          >
                              <Plus size={20} /> Add New Image
                          </button>
                          <input 
                            type="file" 
                            ref={galleryInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            multiple 
                            onChange={handleGalleryAddImage}
                          />
                      </div>
                  )}
              </div>
          </div>
      )}
    </>
  );
};