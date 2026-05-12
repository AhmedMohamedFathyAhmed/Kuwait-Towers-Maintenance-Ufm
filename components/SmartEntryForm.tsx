
import React, { useState, useEffect, useRef } from 'react';
import { MaintenanceRecord, Category, Status, TowerName, ChecklistItem, Shift, InventoryItem } from '../types';
import { COMMON_TASKS, CATEGORIES, TOWERS, SHIFTS, DEFAULT_LOCATIONS, DEFAULT_PARTS, DEFAULT_REASONS, DEFAULT_EXECUTED_BY } from '../constants';
import { parseMaintenanceNote } from '../services/geminiService';
import { Sparkles, Plus, Check, Bot, ArrowDown, History, Package, Camera, X, Image as ImageIcon, Lightbulb } from 'lucide-react';

interface SmartEntryFormProps {
  currentTower: string; // Default tower selected
  onAddRecord: (record: Omit<MaintenanceRecord, 'id' | 'date'>) => void;
  inventory?: InventoryItem[]; // Optional inventory for lookup
}

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
                
                // Compress to JPEG 0.6 quality
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- Reusable Autocomplete Component ---
interface AutocompleteFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  storageKey: string; // Key for localStorage
  defaultOptions: string[]; // Initial seed options
  placeholder?: string;
  className?: string;
  inventorySuggestions?: InventoryItem[]; // Special list from inventory
  smartSuggestions?: string[]; // Context-aware suggestions (Highest Priority)
}

const AutocompleteField: React.FC<AutocompleteFieldProps> = ({ 
  label, value, onChange, storageKey, defaultOptions, placeholder, className, inventorySuggestions, smartSuggestions 
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      // Initialize with defaults if empty
      localStorage.setItem(storageKey, JSON.stringify(defaultOptions));
    }
  }, [storageKey, defaultOptions]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update suggestions logic
  const updateSuggestions = (inputValue: string) => {
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Inventory descriptions
    let invDescriptions: string[] = [];
    if (inventorySuggestions) {
        invDescriptions = inventorySuggestions.map(i => i.description);
    }

    // Smart suggestions (Context aware)
    const smart = smartSuggestions || [];

    // Combine all unique options: Smart > Inventory > History > Defaults
    // Note: We keep them separate in filtering to preserve order
    const allUnique = Array.from(new Set([...smart, ...invDescriptions, ...history, ...defaultOptions]));
    
    if (!inputValue) {
        setSuggestions(allUnique);
    } else {
        const filtered = allUnique.filter((item: string) => 
            item.toLowerCase().includes(inputValue.toLowerCase()) && item !== inputValue
        );
        setSuggestions(filtered);
    }
  };

  const handleFocus = () => {
      updateSuggestions(value);
      setShowSuggestions(true);
  };

  const handleChange = (val: string) => {
      onChange(val);
      updateSuggestions(val);
      setShowSuggestions(true);
  };

  const handleSelect = (item: string) => {
      onChange(item);
      setShowSuggestions(false);
  };

  return (
    <div className={className} ref={wrapperRef}>
        <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center justify-between">
            {label}
            {smartSuggestions && smartSuggestions.length > 0 && !value && (
                <span className="text-[10px] text-purple-600 flex items-center animate-pulse">
                    <Sparkles size={10} className="mr-1"/> AI Suggestions available
                </span>
            )}
        </label>
        <div className="relative">
            <input
                type="text"
                className={`w-full border rounded-md p-2 focus:ring-2 outline-none transition-shadow ${smartSuggestions && smartSuggestions.length > 0 ? 'border-purple-200 focus:ring-purple-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                autoComplete="off"
                style={{ fontFamily: 'Calibri', fontSize: '14px' }}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map((item, idx) => {
                         // Check types of suggestions
                         const isSmart = smartSuggestions?.includes(item);
                         const isInInventory = inventorySuggestions?.some(i => i.description.trim().toLowerCase() === item.trim().toLowerCase());
                         
                         return (
                            <div 
                                key={idx}
                                onClick={() => handleSelect(item)}
                                className={`p-2 cursor-pointer text-xs border-b last:border-0 border-gray-50 flex justify-between items-center group transition-colors
                                    ${isSmart ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium' : 'hover:bg-blue-50 text-gray-700'}
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    {isSmart && (
                                         <span className="bg-purple-200 text-purple-800 p-1 rounded-full" title="Recommended based on description">
                                            <Sparkles size={10} />
                                         </span>
                                    )}
                                    {isInInventory && !isSmart && (
                                        <span className="bg-emerald-100 text-emerald-800 p-1 rounded-full text-[10px] font-bold flex items-center gap-1" title="In Store">
                                            <Package size={10} />
                                        </span>
                                    )}
                                    {!isSmart && !isInInventory && (
                                        <History size={12} className="text-gray-300 group-hover:text-blue-300" />
                                    )}
                                    
                                    <span style={{ fontFamily: 'Calibri', fontSize: '14px' }}>{item}</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};


const SmartEntryForm: React.FC<SmartEntryFormProps> = ({ currentTower, onAddRecord, inventory }) => {
  // AI Input State
  const [rawInput, setRawInput] = useState('');

  // Form State
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [parts, setParts] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Category>(Category.HVAC);
  const [status, setStatus] = useState<Status>(Status.DONE);
  const [building, setBuilding] = useState(currentTower);
  const [shift, setShift] = useState<Shift>('Day');
  const [executedBy, setExecutedBy] = useState('UFM Technicians');
  const [note, setNote] = useState('-');
  
  // Image State
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UX State
  const [descSuggestions, setDescSuggestions] = useState<(ChecklistItem | string)[]>([]);
  const [showDescSuggestions, setShowDescSuggestions] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // Smart Part Suggestions State
  const [smartPartSuggestions, setSmartPartSuggestions] = useState<string[]>([]);

  const descWrapperRef = useRef<HTMLDivElement>(null);

  // Update default building if prop changes
  useEffect(() => {
    if (!building) setBuilding(currentTower);
  }, [currentTower]);

  // --- SMART SUGGESTION LOGIC ---
  useEffect(() => {
    if (!description) {
        setSmartPartSuggestions([]);
        return;
    }

    const suggestions = new Set<string>();
    const descLower = description.toLowerCase();
    
    // 1. Check COMMON_TASKS for direct scenario matches
    COMMON_TASKS.forEach(task => {
        const taskLabel = task.label.toLowerCase();
        // If description contains task keywords or vice versa
        if (descLower.includes(taskLabel) || taskLabel.includes(descLower)) {
            if (task.defaultParts && task.defaultParts !== 'None' && task.defaultParts !== '-') {
                suggestions.add(task.defaultParts);
            }
        }
    });

    // 2. Keyword Matching in Inventory (Rudimentary AI)
    // If description mentions "bulb", suggest items with "bulb"
    if (inventory && inventory.length > 0) {
        // Filter out common small words to focus on nouns
        const stopWords = ['the', 'and', 'for', 'with', 'broken', 'replaced', 'fixed', 'repair', 'check', 'checking'];
        const keywords = descLower.split(' ').filter(w => w.length > 3 && !stopWords.includes(w));

        inventory.forEach(item => {
            const itemDesc = item.description.toLowerCase();
            // If the item description contains significant words from the user description
            if (keywords.some(kw => itemDesc.includes(kw))) {
                suggestions.add(item.description);
            }
        });
    }

    setSmartPartSuggestions(Array.from(suggestions));

  }, [description, inventory]);


  // Close description suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (descWrapperRef.current && !descWrapperRef.current.contains(event.target as Node)) {
        setShowDescSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter description suggestions (Mix of Smart Tasks and History)
  useEffect(() => {
    const smartMatches = COMMON_TASKS.filter(task => 
      task.label.toLowerCase().includes(description.toLowerCase())
    );

    const history: string[] = JSON.parse(localStorage.getItem('history_descriptions') || '[]');
    const historyMatches = history.filter(h => 
        h.toLowerCase().includes(description.toLowerCase()) && 
        h !== description &&
        !smartMatches.some(sm => sm.label === h)
    );

    const combined = [...smartMatches, ...historyMatches];
    
    setDescSuggestions(combined);
    
    if (description && combined.length > 0) setShowDescSuggestions(true);
    else if (!description) setShowDescSuggestions(false);

  }, [description]);

  const handleFocusDescription = () => {
      const history: string[] = JSON.parse(localStorage.getItem('history_descriptions') || '[]');
      const combined = [...COMMON_TASKS, ...history];
      const uniqueHistory = history.filter(h => !COMMON_TASKS.some(t => t.label === h));
      
      setDescSuggestions([...COMMON_TASKS, ...uniqueHistory]);
      if ([...COMMON_TASKS, ...uniqueHistory].length > 0) setShowDescSuggestions(true);
  };

  const handleSelectDescSuggestion = (item: ChecklistItem | string) => {
    if (typeof item === 'string') {
        setDescription(item);
    } else {
        setDescription(item.label);
        setCategory(item.category);
        if (item.defaultReason) setReason(item.defaultReason);
        if (item.defaultParts) setParts(item.defaultParts);
    }
    setShowDescSuggestions(false);
  };

  const saveToHistory = (key: string, value: string) => {
    if (!value || value === '-' || value === 'None' || value.trim() === '') return;
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    const exists = history.some((h: string) => h.toLowerCase() === value.toLowerCase());
    if (!exists) {
        history.push(value);
        localStorage.setItem(key, JSON.stringify(history));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newImages: string[] = [];
          for (let i = 0; i < e.target.files.length; i++) {
              try {
                const compressed = await compressImage(e.target.files[i]);
                newImages.push(compressed);
              } catch (err) {
                  console.error("Image compression failed", err);
              }
          }
          setImages([...images, ...newImages]);
      }
  };

  const removeImage = (index: number) => {
      setImages(images.filter((_, i) => i !== index));
  };

  const handleAIMagic = async () => {
    if (!rawInput) return;
    setIsProcessingAI(true);
    try {
      const result = await parseMaintenanceNote(rawInput, building);
      
      if (result.description) setDescription(result.description);
      if (result.reasonOfFailure) setReason(result.reasonOfFailure);
      if (result.partsReplaced) setParts(result.partsReplaced);
      if (result.location) setLocation(result.location);
      if (result.category) setCategory(result.category);
      if (result.status) setStatus(result.status);
      if (result.shift) setShift(result.shift);
      if (result.executedBy) setExecutedBy(result.executedBy);
      if (result.building) setBuilding(result.building);
      if (result.note) setNote(result.note);

      setRawInput(''); 
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    onAddRecord({
      description,
      reasonOfFailure: reason || '-',
      partsReplaced: parts || 'None',
      location: location || '-',
      category,
      status,
      building,
      shift,
      executedBy,
      note,
      images: images.length > 0 ? images : undefined
    });

    saveToHistory('history_descriptions', description);
    saveToHistory('history_reasons', reason);
    saveToHistory('history_parts', parts);
    saveToHistory('history_locations', location);
    saveToHistory('history_executedBy', executedBy);
    saveToHistory('history_notes', note);
    saveToHistory('history_buildings', building);

    setDescription('');
    setReason('');
    setParts('');
    setLocation('');
    setStatus(Status.DONE);
    setNote('-');
    setImages([]); // Reset images
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8 overflow-hidden">
      
      {/* 1. AI Input Section - Lighter Slate Theme */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 border-b border-slate-600">
        <div className="flex items-center gap-2 mb-2">
            <Bot className="text-teal-400" size={18} />
            <h3 className="font-bold text-white text-sm">Will be analyzed</h3>
        </div>
        <div className="flex gap-2 items-center">
            <input
                type="text"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Type informal note here (e.g., 'critical water leak 3rd floor')..."
                className="flex-1 px-3 h-10 rounded-lg border border-slate-500 bg-slate-600/50 text-white placeholder-slate-300 focus:ring-2 focus:ring-teal-400 outline-none text-sm"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAIMagic();
                    }
                }}
            />
            <button 
                type="button"
                onClick={handleAIMagic}
                disabled={isProcessingAI || !rawInput}
                className="h-10 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px] border border-teal-500/50"
            >
                {isProcessingAI ? (
                    <span className="animate-pulse text-xs">Processing...</span>
                ) : (
                    <>
                        <Sparkles size={16} className="mr-2" />
                        <span className="text-xs">Analyze</span>
                    </>
                )}
            </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <ArrowDown size={12} className="text-teal-400" /> AI will rephrase, fill table.
        </p>
      </div>

      {/* 2. Manual/Verified Entry Form */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
             <h3 className="text-lg font-bold text-gray-700">Report Entry Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* ROW 1: Category (Half Width) & Blocked Spacer */}
            <div className="md:col-span-6">
                <label className="block text-xs font-bold text-gray-600 mb-1">CATEGORY</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            
            {/* Blocked Spacer Area */}
            <div className="hidden md:block md:col-span-6 bg-gray-50 border border-gray-100 border-dashed rounded-md relative mt-5">
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-300 text-xs select-none">///</span>
                </div>
            </div>

            {/* ROW 2: Description and Building */}
            <div className="md:col-span-9 relative" ref={descWrapperRef}>
            <label className="block text-xs font-bold text-gray-600 mb-1">DESCRIPTION (Formal)</label>
            <div className="relative">
                <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="Technical description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onFocus={handleFocusDescription}
                    autoComplete="off"
                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                />
                {/* Suggestions Dropdown (Smart Tasks + History) */}
                {showDescSuggestions && descSuggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                    {descSuggestions.map((item, idx) => {
                        const isSmartTask = typeof item !== 'string';
                        return (
                            <div 
                                key={idx}
                                onClick={() => handleSelectDescSuggestion(item)}
                                className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 border-b last:border-0 border-gray-50 flex justify-between items-center group"
                            >
                                {isSmartTask ? (
                                    // Smart Task Layout
                                    <div>
                                        <div className="font-bold">{(item as ChecklistItem).label}</div>
                                        <div className="text-xs text-gray-400">{(item as ChecklistItem).category} • Auto-fill</div>
                                    </div>
                                ) : (
                                    // History Layout
                                    <div className="flex items-center gap-2">
                                        <History size={14} className="text-gray-400" />
                                        <span>{item as string}</span>
                                    </div>
                                )}
                                <Check size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                            </div>
                        );
                    })}
                </div>
                )}
            </div>
            </div>

            <AutocompleteField 
                className="md:col-span-3"
                label="BUILDING"
                value={building}
                onChange={setBuilding}
                storageKey="history_buildings"
                defaultOptions={TOWERS}
            />

            {/* ROW 3: Reason, Parts, Location */}
            <AutocompleteField 
                className="md:col-span-4"
                label="REASON / TICKET NO."
                value={reason}
                onChange={setReason}
                storageKey="history_reasons"
                defaultOptions={DEFAULT_REASONS}
                placeholder="Reason of Failure..."
            />

            <AutocompleteField 
                className="md:col-span-4"
                label="PARTS REPLACED"
                value={parts}
                onChange={setParts}
                storageKey="history_parts"
                defaultOptions={DEFAULT_PARTS}
                placeholder="Materials used..."
                inventorySuggestions={inventory} // Pass inventory for smart suggestions
                smartSuggestions={smartPartSuggestions} // Pass AI Smart Context Suggestions
            />

            <AutocompleteField 
                className="md:col-span-4"
                label="LOCATION"
                value={location}
                onChange={setLocation}
                storageKey="history_locations"
                defaultOptions={DEFAULT_LOCATIONS}
                placeholder="Floor/Area..."
            />

            {/* ROW 4: Shift, Executed By, Status, Note */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">SHIFT</label>
                <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as Shift)}
                    className="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                >
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <AutocompleteField 
                className="md:col-span-3"
                label="EXECUTED BY"
                value={executedBy}
                onChange={setExecutedBy}
                storageKey="history_executedBy"
                defaultOptions={DEFAULT_EXECUTED_BY}
            />

            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">STATUS</label>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="w-full border border-gray-300 rounded-md p-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    style={{ fontFamily: 'Calibri', fontSize: '14px' }}
                >
                    {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <AutocompleteField 
                className="md:col-span-3"
                label="NOTE"
                value={note}
                onChange={setNote}
                storageKey="history_notes"
                defaultOptions={["-", "Follow up required", "Pending parts"]}
            />
            
             {/* IMAGE UPLOAD SECTION */}
            <div className="col-span-1 md:col-span-2 flex flex-col justify-end">
                <label className="block text-xs font-bold text-gray-600 mb-1">ATTACH IMAGES</label>
                 <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-md p-2 flex items-center justify-center gap-2 text-gray-600 transition-colors h-[42px]"
                 >
                    <Camera size={18} />
                    <span className="text-xs font-bold">{images.length > 0 ? `${images.length} added` : 'Add'}</span>
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageUpload}
                 />
            </div>
            
             {/* IMAGE PREVIEW ROW */}
             {images.length > 0 && (
                 <div className="col-span-12 flex gap-2 overflow-x-auto pb-2 mt-1">
                     {images.map((img, idx) => (
                         <div key={idx} className="relative w-16 h-16 flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden group">
                             <img src={img} alt="preview" className="w-full h-full object-cover" />
                             <button 
                                type="button" 
                                onClick={() => removeImage(idx)}
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 <X size={12} />
                             </button>
                         </div>
                     ))}
                 </div>
             )}

            {/* Add Button Row - Full Width */}
            <div className="col-span-1 md:col-span-12 mt-4">
            <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-md transition-all flex items-center justify-center shadow-md text-lg"
            >
                <Plus size={24} className="mr-2" />
                Add To Report
            </button>
            </div>

        </form>
      </div>
    </div>
  );
};

export default SmartEntryForm;
