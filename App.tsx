
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MaintenanceRecord, ReportHeaderInfo, TowerName, InventoryItem, ExternalTransaction } from './types';
import { TOWERS } from './constants';
import SmartEntryForm from './components/SmartEntryForm';
import { ReportTable } from './components/ReportTable';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import InventorySystem from './components/InventorySystem';
import ExternalStore from './components/ExternalStore';
import ExternalWithdrawals from './components/ExternalWithdrawals';
import { Building2, Settings, LogOut, Database, Trash2, Save, Upload, LayoutDashboard, Table2, Package, Warehouse, Eye, ChevronLeft, ChevronRight, Calendar, HardHat, Download, Share, PlusSquare, X } from 'lucide-react';

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'ADMIN' | 'CLIENT'>('ADMIN');

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // Helper to get YYYY-MM-DD
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  
  // Integrated Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // --- External Store State ---
  const [externalInventory, setExternalInventory] = useState<InventoryItem[]>([]);
  const [externalTransactions, setExternalTransactions] = useState<ExternalTransaction[]>([]);

  // Store header info
  const [headerInfo, setHeaderInfo] = useState<ReportHeaderInfo>({
      preparedBy: 'Ahmed Fathi',
      daySupervisor: 'Mohammed Arif',
      nightSupervisor: 'Mehtab Alam',
      reportDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})
  });
  
  const [activeTower, setActiveTower] = useState<string>(TowerName.KIPCO);
  const [showHeaderSettings, setShowHeaderSettings] = useState(false);
  const [currentView, setCurrentView] = useState<'table' | 'dashboard' | 'inventory' | 'external-store' | 'external-withdrawals'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // History Stats
  const [historyStats, setHistoryStats] = useState({
      descriptions: 0,
      locations: 0,
      reasons: 0,
      parts: 0,
      executedBy: 0
  });

  // Check for existing session on mount
  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('ufm_auth_token');
    if (sessionAuth) {
        setIsAuthenticated(true);
        // Recover role if saved (basic implementation)
        const role = sessionStorage.getItem('ufm_user_role');
        if (role === 'CLIENT') setUserRole('CLIENT');
        else setUserRole('ADMIN');
    }

    // PWA Install Prompt Listener (Android/Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    // iOS Detection
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
        // Show prompt after a small delay to not annoy immediately
        setTimeout(() => setShowIOSPrompt(true), 3000);
    }

  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    }
  };

  // LOAD RECORDS WHEN DATE CHANGES
  useEffect(() => {
    // Load local storage records for the SELECTED DATE
    const savedRecords = localStorage.getItem(`maintenance_logs_${selectedDate}`);
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    } else {
      setRecords([]); // Clear if no records for this day
    }

    // Update Header Date Display to match selected date
    const dateObj = new Date(selectedDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'});
    setHeaderInfo(prev => ({ ...prev, reportDate: formattedDate }));

  }, [selectedDate]);

  useEffect(() => {
    // Load local storage integrated inventory
    const savedInventory = localStorage.getItem('ufm_inventory');
    if (savedInventory) {
        const rawInv = JSON.parse(savedInventory);
        // Migration logic for old data
        const migratedInv = rawInv.map((item: any) => ({
            ...item,
            itemCode: item.itemCode || '-',
            description: item.description || item.name || 'Unknown Item',
            made: item.made || '-',
            unit: item.unit || 'pcs',
            receivedQty: item.receivedQty || item.quantity || 0,
            issuedQty: item.issuedQty || 0,
            requiredQty: item.requiredQty || item.minLevel || 10,
            rackNo: item.rackNo || '-',
            remarks: item.remarks || '-'
        }));
        setInventory(migratedInv);
    }

    // Load External Inventory
    const savedExtInv = localStorage.getItem('ufm_external_inventory');
    if (savedExtInv) {
        setExternalInventory(JSON.parse(savedExtInv));
    }

    // Load External Transactions
    const savedExtTrans = localStorage.getItem('ufm_external_transactions');
    if (savedExtTrans) {
        setExternalTransactions(JSON.parse(savedExtTrans));
    }
    
    // Load stats
    updateHistoryStats();
  }, []);

  // --- PERFORMANCE OPTIMIZATION: Debounced Storage Saving ---
  // Instead of saving immediately (blocking main thread), we wait for changes to settle.
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem(`maintenance_logs_${selectedDate}`, JSON.stringify(records));
    }, 1000); // 1s debounce
    return () => clearTimeout(handler);
  }, [records, selectedDate]);

  useEffect(() => {
      const handler = setTimeout(() => {
        localStorage.setItem('ufm_inventory', JSON.stringify(inventory));
      }, 1000);
      return () => clearTimeout(handler);
  }, [inventory]);

  useEffect(() => {
      const handler = setTimeout(() => {
        localStorage.setItem('ufm_external_inventory', JSON.stringify(externalInventory));
      }, 1000);
      return () => clearTimeout(handler);
  }, [externalInventory]);

  useEffect(() => {
    const handler = setTimeout(() => {
        localStorage.setItem('ufm_external_transactions', JSON.stringify(externalTransactions));
    }, 1000);
    return () => clearTimeout(handler);
  }, [externalTransactions]);

  // Update stats whenever settings are opened
  useEffect(() => {
      if (showHeaderSettings) {
          updateHistoryStats();
      }
  }, [showHeaderSettings]);

  const updateHistoryStats = () => {
      setHistoryStats({
          descriptions: JSON.parse(localStorage.getItem('history_descriptions') || '[]').length,
          locations: JSON.parse(localStorage.getItem('history_locations') || '[]').length,
          reasons: JSON.parse(localStorage.getItem('history_reasons') || '[]').length,
          parts: JSON.parse(localStorage.getItem('history_parts') || '[]').length,
          executedBy: JSON.parse(localStorage.getItem('history_executedBy') || '[]').length,
      });
  };

  const handleClearHistory = () => {
      if (window.confirm("Are you sure you want to delete all saved autocomplete words? This cannot be undone.")) {
          localStorage.removeItem('history_descriptions');
          localStorage.removeItem('history_reasons');
          localStorage.removeItem('history_parts');
          localStorage.removeItem('history_locations');
          localStorage.removeItem('history_executedBy');
          localStorage.removeItem('history_notes');
          localStorage.removeItem('history_buildings');
          updateHistoryStats();
          alert("History cleared successfully.");
          window.location.reload(); 
      }
  };

  // --- Backup & Restore Logic ---
  const handleBackupData = () => {
    const backupData = {
        meta: { date: new Date().toISOString(), version: '1.0' },
        inventory: localStorage.getItem('ufm_inventory'),
        externalInventory: localStorage.getItem('ufm_external_inventory'),
        externalTransactions: localStorage.getItem('ufm_external_transactions'),
        history: {
            descriptions: localStorage.getItem('history_descriptions'),
            reasons: localStorage.getItem('history_reasons'),
            parts: localStorage.getItem('history_parts'),
            locations: localStorage.getItem('history_locations'),
            executedBy: localStorage.getItem('history_executedBy'),
            notes: localStorage.getItem('history_notes'),
            buildings: localStorage.getItem('history_buildings')
        },
        currentLogDate: selectedDate,
        currentLogData: localStorage.getItem(`maintenance_logs_${selectedDate}`)
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UFM_Backup_${selectedDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (!data.history) throw new Error("Invalid backup file");

              if (window.confirm("This will overwrite your current history, inventory, and the log for the backup date. Continue?")) {
                  // Restore History
                  if(data.history.descriptions) localStorage.setItem('history_descriptions', data.history.descriptions);
                  if(data.history.reasons) localStorage.setItem('history_reasons', data.history.reasons);
                  if(data.history.parts) localStorage.setItem('history_parts', data.history.parts);
                  if(data.history.locations) localStorage.setItem('history_locations', data.history.locations);
                  if(data.history.executedBy) localStorage.setItem('history_executedBy', data.history.executedBy);
                  if(data.history.notes) localStorage.setItem('history_notes', data.history.notes);
                  if(data.history.buildings) localStorage.setItem('history_buildings', data.history.buildings);
                  
                  // Restore Integrated Inventory
                  if(data.inventory) localStorage.setItem('ufm_inventory', data.inventory);
                  
                  // Restore External Inventory & Transactions
                  if(data.externalInventory) localStorage.setItem('ufm_external_inventory', data.externalInventory);
                  if(data.externalTransactions) localStorage.setItem('ufm_external_transactions', data.externalTransactions);

                  // Restore Log
                  if (data.currentLogDate && data.currentLogData) {
                      localStorage.setItem(`maintenance_logs_${data.currentLogDate}`, data.currentLogData);
                      if (data.currentLogDate === selectedDate) {
                          setRecords(JSON.parse(data.currentLogData));
                      } else {
                          alert(`Log for ${data.currentLogDate} restored. Switch date to view.`);
                      }
                  }

                  alert("Data restored successfully!");
                  window.location.reload();
              }
          } catch (err) {
              alert("Error reading backup file. Please make sure it is a valid JSON file from this app.");
              console.error(err);
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogin = (role: 'ADMIN' | 'CLIENT') => {
      setIsAuthenticated(true);
      setUserRole(role);
      sessionStorage.setItem('ufm_auth_token', 'valid');
      sessionStorage.setItem('ufm_user_role', role);
      
      // If client, default to dashboard for professionalism
      if (role === 'CLIENT') {
          setCurrentView('dashboard');
      } else {
          setCurrentView('table');
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserRole('ADMIN');
      sessionStorage.removeItem('ufm_auth_token');
      sessionStorage.removeItem('ufm_user_role');
  };

  // Use useCallback to prevent recreating this function on every render
  const handleAddRecord = useCallback((newRecord: Omit<MaintenanceRecord, 'id' | 'date'>) => {
    const record: MaintenanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      ...newRecord
    };
    
    setRecords(prev => [...prev, record]);

    // Smart Deduction Logic (Simplified for performance)
    const partUsed = newRecord.partsReplaced;
    if (partUsed && partUsed !== 'None' && partUsed !== '-') {
        setInventory(prevInv => {
             const cleanPartUsed = partUsed.trim().toLowerCase();
             let matchFound = false;
             
             const updated = prevInv.map(item => {
                 if (matchFound) return item;
                 const cleanDescription = item.description.trim().toLowerCase();
                 if (cleanDescription && cleanPartUsed.includes(cleanDescription)) {
                      matchFound = true;
                      let qtyToDeduct = 1;
                      const qtyMatch = cleanPartUsed.match(/(?:[-x:\(\)]|qty)\s*(\d+)/i) || cleanPartUsed.match(/(\d+)\s*(?:nos|pcs|pieces)/i);
                      if (qtyMatch && qtyMatch[1]) qtyToDeduct = parseInt(qtyMatch[1], 10);
                      
                      return { 
                        ...item, 
                        issuedQty: (item.issuedQty || 0) + qtyToDeduct,
                        lastUpdated: new Date().toISOString()
                      };
                 }
                 return item;
             });
             return matchFound ? updated : prevInv;
        });
    }
  }, []);

  const handleUpdateRecord = useCallback((id: string, field: keyof MaintenanceRecord, value: any) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const handleDeleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleUpdateInventory = useCallback((newInventory: InventoryItem[]) => {
      setInventory(newInventory);
  }, []);
  
  const handleUpdateExternalInventory = useCallback((newInventory: InventoryItem[]) => {
      setExternalInventory(newInventory);
  }, []);

  const handleUpdateExternalTransactions = useCallback((newTransactions: ExternalTransaction[]) => {
      setExternalTransactions(newTransactions);
  }, []);

  // --- Date Navigation Handlers ---
  const changeDate = (days: number) => {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + days);
      setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
      setSelectedDate(getTodayStr());
  };

  if (!isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} />;
  }

  // --- CLIENT VIEW (RESTRICTED) ---
  const isClient = userRole === 'CLIENT';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-left" dir="ltr">
      
      {/* Top Navbar */}
      <nav className="bg-teal-800 text-white p-4 shadow-lg print:hidden w-full">
        <div className="w-full px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <Building2 className="text-emerald-300" size={28} />
                <div>
                    <h1 className="text-xl font-bold tracking-wide">UFM MAINTENANCE LOG</h1>
                    <p className="text-xs text-teal-100">Daily Report System {isClient && '(Client View)'}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                
                {/* PWA Install Button (Android/Desktop) */}
                {showInstallBtn && (
                    <button 
                        onClick={handleInstallClick}
                        className="flex items-center gap-2 text-sm bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white px-3 py-2 rounded-md transition-all shadow-md animate-pulse border border-emerald-400"
                    >
                        <Download size={16} />
                        <span className="hidden md:inline font-bold">Install App</span>
                    </button>
                )}
                
                {/* iOS Install Prompt Button (Manual Trigger) */}
                {showIOSPrompt && (
                    <button 
                        onClick={() => setShowIOSPrompt(false)} // Just close on click, they've seen it
                        className="flex items-center gap-2 text-sm bg-gray-700/50 hover:bg-gray-700 text-white px-3 py-2 rounded-md transition-colors border border-gray-600"
                        title="Install on iPhone"
                    >
                         <Share size={16} />
                         <span className="hidden md:inline text-xs">Install on iPhone</span>
                    </button>
                )}

                {/* View Toggle Group */}
                <div className="bg-teal-900/50 p-1 rounded-lg border border-teal-700 flex mr-4">
                    
                    {/* Dashboard Button */}
                    <button 
                        onClick={() => setCurrentView('dashboard')}
                        className={`p-2 rounded-md transition-all ${currentView === 'dashboard' ? 'bg-emerald-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800'}`}
                        title="Analytics Dashboard"
                    >
                        <LayoutDashboard size={18} />
                    </button>
                    
                    {/* Table Button */}
                    <button 
                        onClick={() => setCurrentView('table')}
                        className={`p-2 rounded-md transition-all ${currentView === 'table' ? 'bg-emerald-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800'}`}
                        title="Daily Report Table"
                    >
                        <Table2 size={18} />
                    </button>

                    {/* Inventory - HIDDEN FOR CLIENTS */}
                    {!isClient && (
                        <button 
                            onClick={() => setCurrentView('inventory')}
                            className={`p-2 rounded-md transition-all ${currentView === 'inventory' ? 'bg-emerald-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800'}`}
                            title="Report Store (Integrated)"
                        >
                            <Package size={18} />
                        </button>
                    )}
                </div>

                {/* Separate System Button - HIDDEN FOR CLIENTS */}
                {!isClient && (
                    <>
                    <button 
                        onClick={() => setCurrentView('external-store')}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors border mr-1 ${currentView === 'external-store' ? 'bg-orange-600 text-white border-orange-500' : 'bg-teal-900 hover:bg-orange-600 text-white border-teal-700'}`}
                        title="External General Warehouse"
                    >
                        <Warehouse size={16} />
                        <span className="hidden md:inline">External Store</span>
                    </button>

                    <button 
                        onClick={() => setCurrentView('external-withdrawals')}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md transition-colors border mr-2 ${currentView === 'external-withdrawals' ? 'bg-red-600 text-white border-red-500' : 'bg-teal-900 hover:bg-red-600 text-white border-teal-700'}`}
                        title="Technician Withdrawals & Consumptions"
                    >
                        <HardHat size={16} />
                        <span className="hidden md:inline">Withdrawals</span>
                    </button>
                    </>
                )}

                {!isClient && (
                    <button 
                        onClick={() => setShowHeaderSettings(!showHeaderSettings)}
                        className="flex items-center gap-2 text-sm bg-teal-900 hover:bg-teal-950 px-3 py-2 rounded-md transition-colors border border-teal-700"
                    >
                        <Settings size={16} />
                        <span className="hidden md:inline">Settings</span>
                    </button>
                )}

                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm bg-red-800/80 hover:bg-red-900 px-3 py-2 rounded-md transition-colors border border-red-900/50"
                    title="Logout"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
      </nav>

      {/* --- iOS INSTALL INSTRUCTIONS MODAL (Fixed Bottom Sheet) --- */}
      {showIOSPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-5">
           <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl rounded-xl p-4 max-w-md mx-auto relative">
              <button 
                 onClick={() => setShowIOSPrompt(false)}
                 className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              >
                 <X size={18} />
              </button>
              <div className="flex gap-4 items-start">
                  <div className="bg-gray-100 p-2 rounded-lg">
                      <Share className="text-blue-500" size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1">Install on iPhone</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                          To install this app on your home screen:
                          <br/>
                          1. Tap the <span className="font-bold text-blue-600">Share</span> button below in Safari.
                          <br/>
                          2. Scroll down and tap <span className="font-bold flex items-center gap-1 inline-flex"><PlusSquare size={12}/> Add to Home Screen</span>.
                      </p>
                  </div>
              </div>
              {/* Arrow pointing down */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 rotate-45 w-4 h-4 bg-white border-r border-b border-gray-200"></div>
           </div>
        </div>
      )}

      {/* --- DATE NAVIGATOR BAR (Always visible in Table/Dashboard) --- */}
      {(currentView === 'table' || currentView === 'dashboard') && (
        <div className="bg-white border-b border-gray-200 p-3 shadow-sm print:hidden">
            <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-4">
                <button 
                    onClick={() => changeDate(-1)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Previous Day"
                >
                    <ChevronLeft size={24} />
                </button>
                
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                    <Calendar size={18} className="text-teal-600" />
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer text-sm"
                    />
                </div>

                <button 
                    onClick={() => changeDate(1)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Next Day"
                >
                    <ChevronRight size={24} />
                </button>

                {selectedDate !== getTodayStr() && (
                    <button 
                        onClick={goToToday}
                        className="ml-4 text-xs font-bold text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-3 py-1 rounded border border-teal-200 transition-colors"
                    >
                        Back to Today
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Header Settings Panel (Collapsible) - HIDDEN FOR CLIENTS */}
      {!isClient && showHeaderSettings && (
          <div className="bg-white border-b border-gray-200 p-6 print:hidden w-full shadow-inner animate-in slide-in-from-top-2">
              <div className="max-w-[1200px] mx-auto">
                  
                  {/* Section 1: Report Information */}
                  <h3 className="text-sm font-bold text-teal-800 mb-4 border-b pb-2">Report Header Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Prepared By</label>
                          <input 
                            type="text" 
                            value={headerInfo.preparedBy} 
                            onChange={e => setHeaderInfo({...headerInfo, preparedBy: e.target.value})}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none"
                           />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Day Supervisor</label>
                          <input 
                            type="text" 
                            value={headerInfo.daySupervisor} 
                            onChange={e => setHeaderInfo({...headerInfo, daySupervisor: e.target.value})}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none"
                           />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Night Supervisor</label>
                          <input 
                            type="text" 
                            value={headerInfo.nightSupervisor} 
                            onChange={e => setHeaderInfo({...headerInfo, nightSupervisor: e.target.value})}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none"
                           />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Report Date (Auto-syncs with nav)</label>
                          <input 
                            type="text" 
                            value={headerInfo.reportDate} 
                            onChange={e => setHeaderInfo({...headerInfo, reportDate: e.target.value})}
                            className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none bg-gray-50"
                           />
                      </div>
                  </div>

                  {/* Section 2: System Data & Transfer */}
                  <div className="flex justify-between items-center border-b pb-2 mb-4">
                      <h3 className="text-sm font-bold text-teal-800 flex items-center gap-2">
                          <Database size={16} /> System Data & History
                      </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      
                      {/* Left: Stats */}
                      <div>
                        <div className="text-xs text-gray-600 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                            <div>Saved Descriptions: <span className="font-bold text-gray-900">{historyStats.descriptions}</span></div>
                            <div>Saved Locations: <span className="font-bold text-gray-900">{historyStats.locations}</span></div>
                            <div>Saved Reasons: <span className="font-bold text-gray-900">{historyStats.reasons}</span></div>
                            <div>Saved Parts: <span className="font-bold text-gray-900">{historyStats.parts}</span></div>
                        </div>
                        <button 
                                onClick={handleClearHistory}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors text-xs font-medium border border-transparent hover:border-red-100"
                            >
                                <Trash2 size={14} />
                                Clear Autocomplete History
                        </button>
                      </div>

                      {/* Right: Transfer Controls */}
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                          <h4 className="text-xs font-bold text-indigo-800 mb-3 uppercase tracking-wider">Transfer Data</h4>
                          <p className="text-xs text-indigo-600 mb-4">Backup downloads current day log + inventory.</p>
                          
                          <div className="flex gap-3">
                              <button 
                                onClick={handleBackupData}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-bold shadow-sm"
                              >
                                  <Save size={16} />
                                  Backup Current
                              </button>
                              
                              <div className="relative flex-1">
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleRestoreData}
                                    accept=".json"
                                    className="hidden"
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md transition-colors text-sm font-bold shadow-sm"
                                >
                                    <Upload size={16} />
                                    Restore Data
                                </button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-4 overflow-y-auto print:p-0 w-full">
        <div className="w-full px-2">
          
          {/* Conditional Rendering based on View Mode */}
          {currentView === 'table' ? (
            <>
                {/* Input Form Section (Hidden in Print and Client Mode) */}
                {!isClient && (
                    <div className="print:hidden max-w-[1200px] mx-auto mb-6 animate-in fade-in slide-in-from-bottom-2">
                        <SmartEntryForm 
                            currentTower={activeTower}
                            onAddRecord={handleAddRecord}
                            inventory={inventory}
                        />
                    </div>
                )}
                
                {isClient && (
                    <div className="max-w-[1200px] mx-auto mb-6 bg-teal-50 border border-teal-200 p-4 rounded-lg text-center text-teal-800 text-sm flex items-center justify-center gap-2">
                        <Eye size={18} />
                        <span>Client Read-Only View Enabled. Editing disabled.</span>
                    </div>
                )}

                {/* The Report Table - Full Width */}
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    <ReportTable 
                        records={records}
                        headerInfo={headerInfo}
                        onUpdate={handleUpdateRecord}
                        onDelete={handleDeleteRecord}
                        readOnly={isClient}
                    />
                </div>
            </>
          ) : currentView === 'dashboard' ? (
            <div className="max-w-[1200px] mx-auto pt-4">
                <Dashboard records={records} />
            </div>
          ) : currentView === 'inventory' ? (
             <div className="max-w-[1200px] mx-auto pt-4">
                <InventorySystem inventory={inventory} onUpdateInventory={handleUpdateInventory} />
             </div>
          ) : currentView === 'external-store' ? (
            /* External Store View */
            <div className="max-w-[1200px] mx-auto pt-4">
                <ExternalStore 
                    inventory={externalInventory} 
                    onUpdateInventory={handleUpdateExternalInventory} 
                    transactions={externalTransactions}
                    onUpdateTransactions={handleUpdateExternalTransactions}
                />
            </div>
          ) : (
            /* External Withdrawals View */
             <div className="max-w-[1200px] mx-auto pt-4">
                <ExternalWithdrawals
                    inventory={externalInventory} 
                    onUpdateInventory={handleUpdateExternalInventory} 
                    transactions={externalTransactions}
                    onUpdateTransactions={handleUpdateExternalTransactions}
                />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;