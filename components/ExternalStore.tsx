
import React, { useState, useMemo } from 'react';
import { InventoryItem, ExternalTransaction } from '../types';
import { 
  Plus, Search, Trash2, Edit2, Archive, 
  ArrowDownLeft, Save, X, Package, Calendar, Hash, User, FileText, AlertTriangle, History, ArrowUpRight, Check, RotateCcw
} from 'lucide-react';

interface ExternalStoreProps {
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  transactions: ExternalTransaction[];
  onUpdateTransactions: (t: ExternalTransaction[]) => void;
}

const ExternalStore: React.FC<ExternalStoreProps> = ({ inventory, onUpdateInventory, transactions, onUpdateTransactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Main Modal States ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  // --- History Ledger State ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<InventoryItem | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editTransForm, setEditTransForm] = useState({
      quantity: '',
      date: '',
      remarks: ''
  });

  // --- Delete Confirmation State ---
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null, type: 'ITEM' | 'TRANS'}>({
      isOpen: false, 
      id: null,
      type: 'ITEM'
  });
  
  // --- Item Form States ---
  const [formData, setFormData] = useState({
      // Item Details
      id: '',
      itemCode: '', 
      description: '', 
      category: 'General', 
      made: '', 
      unit: 'pcs',
      requiredQty: 0, 
      rackNo: '', 
      remarks: '',
      
      // Stock In (Transaction) Details
      addStockQty: '' as any, // Quantity to ADD
      stockDate: new Date().toISOString().split('T')[0],
      stockInvoice: '',
      stockSupplier: '',
      stockRemarks: ''
  });

  // --- HELPER: Recalculate Totals ---
  const recalculateItemTotals = (targetItemId: string, currentTransactions: ExternalTransaction[]) => {
      const itemTrans = currentTransactions.filter(t => t.itemId === targetItemId);
      const totalReceived = itemTrans.filter(t => t.type === 'IN').reduce((acc, t) => acc + Number(t.quantity), 0);
      const totalIssued = itemTrans.filter(t => t.type === 'OUT').reduce((acc, t) => acc + Number(t.quantity), 0);
      
      const updatedInventory = inventory.map(item => {
          if (item.id === targetItemId) {
              return { ...item, receivedQty: totalReceived, issuedQty: totalIssued, lastUpdated: new Date().toISOString() };
          }
          return item;
      });
      onUpdateInventory(updatedInventory);
  };

  // --- ITEM MANAGEMENT ---

  const openNewItemModal = () => {
      setFormData({
        id: '',
        itemCode: '', description: '', category: 'General', made: '', unit: 'pcs',
        requiredQty: 0, rackNo: '', remarks: '',
        addStockQty: '', stockDate: new Date().toISOString().split('T')[0], stockInvoice: '', stockSupplier: '', stockRemarks: ''
      });
      setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
      setFormData({
          id: item.id,
          itemCode: item.itemCode,
          description: item.description,
          category: item.category as string,
          made: item.made,
          unit: item.unit,
          requiredQty: item.requiredQty,
          rackNo: item.rackNo,
          remarks: item.remarks,
          addStockQty: '', 
          stockDate: new Date().toISOString().split('T')[0], 
          stockInvoice: '', 
          stockSupplier: '', 
          stockRemarks: ''
      });
      setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;

    let targetItemId = formData.id;
    let updatedInventory = [...inventory];
    let updatedTransactions = [...transactions];

    // 1. SAVE / UPDATE ITEM DETAILS
    if (targetItemId) {
        updatedInventory = updatedInventory.map(item => item.id === targetItemId ? { 
            ...item, 
            itemCode: formData.itemCode || '-',
            description: formData.description,
            category: formData.category,
            made: formData.made || '-',
            unit: formData.unit,
            requiredQty: Number(formData.requiredQty),
            rackNo: formData.rackNo || '-',
            remarks: formData.remarks || '-',
            lastUpdated: new Date().toISOString() 
        } : item);
    } else {
        targetItemId = Math.random().toString(36).substr(2, 9);
        const newItem: InventoryItem = {
            id: targetItemId,
            itemCode: formData.itemCode || '-',
            description: formData.description,
            category: formData.category,
            made: formData.made || '-',
            unit: formData.unit,
            requiredQty: Number(formData.requiredQty),
            receivedQty: 0, 
            issuedQty: 0,
            rackNo: formData.rackNo || '-',
            remarks: formData.remarks || '-',
            lastUpdated: new Date().toISOString()
        };
        updatedInventory = [...updatedInventory, newItem];
    }

    // 2. HANDLE STOCK IN (If Qty entered)
    if (formData.addStockQty && Number(formData.addStockQty) > 0) {
        const qty = parseFloat(String(formData.addStockQty));
        const newTrans: ExternalTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            itemId: targetItemId,
            type: 'IN',
            quantity: qty,
            transUnit: formData.unit,
            date: formData.stockDate,
            building: 'General Warehouse',
            reference: formData.stockInvoice || '-',
            party: formData.stockSupplier || '-',
            companyId: '-', 
            remarks: formData.stockRemarks || 'Initial Stock / Manual Add',
            timestamp: Date.now()
        };
        updatedTransactions = [newTrans, ...updatedTransactions];
    }

    // 3. COMMIT CHANGES
    onUpdateInventory(updatedInventory);
    onUpdateTransactions(updatedTransactions);
    
    // 4. RECALCULATE (If transaction was added)
    if (formData.addStockQty && Number(formData.addStockQty) > 0) {
        // Recalculate immediately with the new transaction list
        const itemTrans = updatedTransactions.filter(t => t.itemId === targetItemId);
        const totalReceived = itemTrans.filter(t => t.type === 'IN').reduce((acc, t) => acc + Number(t.quantity), 0);
        const totalIssued = itemTrans.filter(t => t.type === 'OUT').reduce((acc, t) => acc + Number(t.quantity), 0);
        
        onUpdateInventory(updatedInventory.map(item => {
            if (item.id === targetItemId) {
                return { ...item, receivedQty: totalReceived, issuedQty: totalIssued };
            }
            return item;
        }));
    }

    setIsItemModalOpen(false);
  };

  // --- DELETE HANDLING (Item) ---
  const requestDeleteItem = (id: string) => {
      setDeleteConfirm({ isOpen: true, id, type: 'ITEM' });
  };

  // --- HISTORY / LEDGER LOGIC ---
  const openHistory = (item: InventoryItem) => {
      setSelectedHistoryItem(item);
      setEditingTransactionId(null);
      setIsHistoryOpen(true);
  };

  const startEditTransaction = (t: ExternalTransaction) => {
      setEditingTransactionId(t.id);
      setEditTransForm({
          quantity: t.quantity.toString(),
          date: t.date,
          remarks: t.remarks
      });
  };

  const cancelEditTransaction = () => {
      setEditingTransactionId(null);
      setEditTransForm({ quantity: '', date: '', remarks: '' });
  };

  const saveEditTransaction = (originalTrans: ExternalTransaction) => {
      if (!editTransForm.quantity || Number(editTransForm.quantity) <= 0) return;

      const updatedTransactions = transactions.map(t => t.id === originalTrans.id ? {
          ...t,
          quantity: Number(editTransForm.quantity),
          date: editTransForm.date,
          remarks: editTransForm.remarks
      } : t);

      onUpdateTransactions(updatedTransactions);
      recalculateItemTotals(originalTrans.itemId, updatedTransactions);
      setEditingTransactionId(null);
  };

  const requestDeleteTransaction = (id: string) => {
      setDeleteConfirm({ isOpen: true, id, type: 'TRANS' });
  };

  // --- UNIVERSAL CONFIRM DELETE ---
  const confirmDelete = () => {
      if (!deleteConfirm.id) return;

      if (deleteConfirm.type === 'ITEM') {
          const id = deleteConfirm.id;
          const updatedInventory = inventory.filter(i => i.id !== id);
          onUpdateInventory(updatedInventory);
          
          const updatedTransactions = transactions.filter(t => t.itemId !== id);
          onUpdateTransactions(updatedTransactions);
      } 
      else if (deleteConfirm.type === 'TRANS') {
          const transId = deleteConfirm.id;
          // Find item ID before deleting to recalculate
          const trans = transactions.find(t => t.id === transId);
          if (trans) {
              const updatedTransactions = transactions.filter(t => t.id !== transId);
              onUpdateTransactions(updatedTransactions);
              recalculateItemTotals(trans.itemId, updatedTransactions);
          }
      }
      setDeleteConfirm({ isOpen: false, id: null, type: 'ITEM' });
  };


  const filteredInventory = useMemo<InventoryItem[]>(() => {
      return inventory.filter(item => 
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.rackNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [inventory, searchTerm]);

  // Get transactions for the history modal
  const historyTransactions = useMemo(() => {
      if (!selectedHistoryItem) return [];
      return transactions
        .filter(t => t.itemId === selectedHistoryItem.id)
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }, [transactions, selectedHistoryItem]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
        
        {/* Header */}
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                 <div className="bg-orange-600 p-3 rounded-lg text-white shadow-md">
                    <Archive size={28} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">External Store</h2>
                    <p className="text-xs text-gray-500">Warehouse Master List</p>
                 </div>
             </div>
             
             <div className="flex flex-1 w-full md:w-auto gap-3 items-center justify-end">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search items..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                </div>
                <button 
                    onClick={openNewItemModal}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md whitespace-nowrap"
                >
                    <Plus size={18} /> New Item
                </button>
             </div>
        </div>

        {/* --- MAIN TABLE --- */}
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-700 text-white text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4 border-r border-slate-600 w-12">#</th>
                            <th className="p-4 border-r border-slate-600 w-32">Code</th>
                            <th className="p-4 border-r border-slate-600 text-left pl-4">Description</th>
                            <th className="p-4 border-r border-slate-600 w-24">Made</th>
                            <th className="p-4 border-r border-slate-600 w-20">Unit</th>
                            <th className="p-4 border-r border-slate-600 w-20">Rack</th>
                            <th className="p-4 border-r border-slate-600 bg-slate-800/50 w-20">Min</th>
                            <th className="p-4 border-r border-slate-600 bg-blue-900/30 w-24 text-blue-100">In</th>
                            <th className="p-4 border-r border-slate-600 bg-red-900/30 w-24 text-red-100">Out</th>
                            <th className="p-4 border-r border-slate-600 bg-orange-600 w-24">AVAIL</th>
                            <th className="p-4 w-36">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredInventory.map((item: InventoryItem, idx: number) => {
                            const received: number = Number(item.receivedQty || 0);
                            const issued: number = Number(item.issuedQty || 0);
                            const available: number = parseFloat((received - issued).toFixed(2));
                            const isLow: boolean = available < item.requiredQty;
                            
                            return (
                                <tr key={item.id} className={`hover:bg-orange-50/20 transition-colors group ${isLow ? 'bg-red-50/40' : ''}`}>
                                    <td className="p-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                                    <td className="p-3 text-xs font-bold text-slate-600 font-mono">{item.itemCode}</td>
                                    <td className="p-3 text-sm font-bold text-left text-gray-800">
                                        {item.description}
                                        <div className="text-[10px] text-gray-400 font-normal">{item.category}</div>
                                    </td>
                                    <td className="p-3 text-xs text-gray-600">{item.made}</td>
                                    <td className="p-3 text-xs font-bold text-gray-600">{item.unit}</td>
                                    <td className="p-3 text-xs text-gray-600 font-mono bg-gray-50">{item.rackNo}</td>
                                    
                                    <td className="p-3 text-xs font-bold text-gray-400">{item.requiredQty}</td>
                                    <td className="p-3 text-sm font-bold text-blue-700 bg-blue-50/30">{received}</td>
                                    <td className="p-3 text-sm font-bold text-red-700 bg-red-50/30">{issued}</td>
                                    <td className={`p-3 text-base font-extrabold ${available <= 0 ? 'text-red-600' : 'text-orange-600'} bg-orange-50/30`}>
                                        {available}
                                    </td>

                                    <td className="p-2">
                                        <div className="flex justify-center items-center gap-1">
                                            {/* History Button */}
                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openHistory(item);
                                                }} 
                                                className="p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded transition-colors cursor-pointer" 
                                                title="View History / Ledger"
                                            >
                                                <History size={16} />
                                            </button>

                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditItemModal(item);
                                                }} 
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer" 
                                                title="Edit & Add Stock"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            
                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    requestDeleteItem(item.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer" 
                                                title="Delete Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInventory.length === 0 && (
                            <tr><td colSpan={11} className="p-8 text-center text-gray-400">No items found.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        </div>

        {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
        {deleteConfirm.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 border-t-4 border-red-500">
                    <div className="flex flex-col items-center text-center">
                        <div className="bg-red-100 p-3 rounded-full mb-4">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {deleteConfirm.type === 'ITEM' ? 'Delete Item?' : 'Delete Transaction?'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            {deleteConfirm.type === 'ITEM' 
                                ? 'Are you sure? This will remove the item and ALL its history. This cannot be undone.' 
                                : 'Are you sure? Deleting this transaction will recalculate the item inventory.'}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setDeleteConfirm({isOpen: false, id: null, type: 'ITEM'})}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- ITEM MODAL (NEW/EDIT + STOCK IN) --- */}
        {isItemModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                    <div className="bg-orange-700 p-4 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {formData.id ? <Edit2 size={20}/> : <Plus size={20}/>}
                            {formData.id ? 'Edit Item / Receive Stock' : 'Register New Item'}
                        </h3>
                        <button type="button" onClick={() => setIsItemModalOpen(false)} className="text-orange-200 hover:text-white"><X size={24}/></button>
                    </div>
                    
                    <form onSubmit={handleSaveItem} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-12">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1 mb-2 flex items-center gap-2">
                                <Package size={14}/> Item Specification
                             </h4>
                        </div>
                        {/* ... Existing Item Inputs ... */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Item Code</label>
                            <input type="text" value={formData.itemCode} onChange={e => setFormData({...formData, itemCode: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="CODE-001"/>
                        </div>
                        <div className="md:col-span-6">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                            <input type="text" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 outline-none font-bold text-gray-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="Item Name / Specs"/>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                            <select 
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
                            >
                                <option value="General">General</option>
                                <option value="HVAC">HVAC</option>
                                <option value="Plumbing">Plumbing</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Civil">Civil</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Made (Brand)</label>
                            <input type="text" value={formData.made} onChange={e => setFormData({...formData, made: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="Brand"/>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                            <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="pcs, box"/>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Rack No.</label>
                            <input type="text" value={formData.rackNo} onChange={e => setFormData({...formData, rackNo: e.target.value})} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="A-01"/>
                        </div>
                         <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Min Level (Alert)</label>
                            <input type="number" min="0" value={formData.requiredQty} onChange={e => setFormData({...formData, requiredQty: Number(e.target.value)})} className="w-full border border-gray-300 rounded p-2.5 outline-none text-center font-bold text-gray-800"/>
                        </div>

                        <div className="md:col-span-12 mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                             <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider border-b border-blue-200 pb-2 mb-4 flex items-center gap-2">
                                <ArrowDownLeft size={18}/> Stock Receiving (Add New Stock)
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                 <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-blue-700 mb-1">QUANTITY TO ADD</label>
                                    <input 
                                        type="number" step="any"
                                        value={formData.addStockQty} 
                                        onChange={e => setFormData({...formData, addStockQty: e.target.value})} 
                                        className="w-full border-2 border-blue-200 rounded-md p-2.5 outline-none text-center font-bold text-blue-800 text-lg focus:border-blue-500"
                                        placeholder="0.00"
                                    />
                                 </div>
                                 <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><Calendar size={12}/> DATE</label>
                                    <input type="date" value={formData.stockDate} onChange={e => setFormData({...formData, stockDate: e.target.value})} className="w-full border border-blue-200 rounded-md p-2.5 outline-none text-sm"/>
                                 </div>
                                 <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><Hash size={12}/> INVOICE NO</label>
                                    <input type="text" value={formData.stockInvoice} onChange={e => setFormData({...formData, stockInvoice: e.target.value})} className="w-full border border-blue-200 rounded-md p-2.5 outline-none text-sm" placeholder="Inv #"/>
                                 </div>
                                 <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><User size={12}/> SUPPLIER</label>
                                    <input type="text" value={formData.stockSupplier} onChange={e => setFormData({...formData, stockSupplier: e.target.value})} className="w-full border border-blue-200 rounded-md p-2.5 outline-none text-sm" placeholder="Company"/>
                                 </div>
                                 <div className="md:col-span-12">
                                     <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1"><FileText size={12}/> REMARKS</label>
                                     <input type="text" value={formData.stockRemarks} onChange={e => setFormData({...formData, stockRemarks: e.target.value})} className="w-full border border-blue-200 rounded-md p-2.5 outline-none text-sm" placeholder="Stock In notes..."/>
                                 </div>
                             </div>
                        </div>

                        <div className="md:col-span-12 flex justify-end gap-3 pt-4 border-t mt-2">
                            <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-bold transition-colors">Cancel</button>
                            <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-8 rounded-lg shadow-md transition-all flex items-center gap-2">
                                <Save size={18} /> {formData.id ? 'Save Changes' : 'Create Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* --- HISTORY / LEDGER MODAL --- */}
        {isHistoryOpen && selectedHistoryItem && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                    
                    {/* Header */}
                    <div className="bg-slate-800 p-4 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <History size={20}/> Item Ledger
                            </h3>
                            <div className="text-slate-300 text-sm mt-1">
                                {selectedHistoryItem.description} ({selectedHistoryItem.itemCode})
                            </div>
                        </div>
                        <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 bg-slate-100 border-b border-gray-200">
                        <div className="p-3 text-center border-r border-gray-200">
                             <div className="text-[10px] font-bold text-gray-500 uppercase">Total Received</div>
                             <div className="font-bold text-blue-700 text-lg">{selectedHistoryItem.receivedQty}</div>
                        </div>
                        <div className="p-3 text-center border-r border-gray-200">
                             <div className="text-[10px] font-bold text-gray-500 uppercase">Total Issued</div>
                             <div className="font-bold text-red-700 text-lg">{selectedHistoryItem.issuedQty}</div>
                        </div>
                        <div className="p-3 text-center bg-orange-50">
                             <div className="text-[10px] font-bold text-orange-800 uppercase">Current Balance</div>
                             <div className="font-bold text-orange-600 text-lg">
                                 {Number(selectedHistoryItem.receivedQty) - Number(selectedHistoryItem.issuedQty)} {selectedHistoryItem.unit}
                             </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="p-3 border-b">Date</th>
                                    <th className="p-3 border-b">Type</th>
                                    <th className="p-3 border-b">Qty</th>
                                    <th className="p-3 border-b">Ref / Tower</th>
                                    <th className="p-3 border-b">Party / Tech</th>
                                    <th className="p-3 border-b">Remarks</th>
                                    <th className="p-3 border-b text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {historyTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        {/* IF EDITING THIS ROW */}
                                        {editingTransactionId === t.id ? (
                                            <>
                                                <td className="p-2"><input type="date" value={editTransForm.date} onChange={e => setEditTransForm({...editTransForm, date: e.target.value})} className="border p-1 rounded w-full text-xs"/></td>
                                                <td className="p-2"><span className={`badge px-2 py-1 rounded text-xs font-bold ${t.type === 'IN' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span></td>
                                                <td className="p-2"><input type="number" step="any" value={editTransForm.quantity} onChange={e => setEditTransForm({...editTransForm, quantity: e.target.value})} className="border p-1 rounded w-20 text-xs font-bold"/></td>
                                                <td className="p-2 text-xs text-gray-400">{t.building}</td>
                                                <td className="p-2 text-xs text-gray-400">{t.party}</td>
                                                <td className="p-2"><input type="text" value={editTransForm.remarks} onChange={e => setEditTransForm({...editTransForm, remarks: e.target.value})} className="border p-1 rounded w-full text-xs"/></td>
                                                <td className="p-2 text-center flex gap-1 justify-center">
                                                    <button onClick={() => saveEditTransaction(t)} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><Check size={14}/></button>
                                                    <button onClick={cancelEditTransaction} className="bg-gray-400 text-white p-1 rounded hover:bg-gray-500"><X size={14}/></button>
                                                </td>
                                            </>
                                        ) : (
                                            /* NORMAL DISPLAY ROW */
                                            <>
                                                <td className="p-3 font-mono text-xs text-gray-500">{t.date}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center w-fit gap-1 ${t.type === 'IN' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                                        {t.type === 'IN' ? <ArrowDownLeft size={10}/> : <ArrowUpRight size={10}/>} {t.type}
                                                    </span>
                                                </td>
                                                <td className={`p-3 font-bold ${t.type === 'IN' ? 'text-blue-700' : 'text-red-700'}`}>
                                                    {t.quantity} <span className="text-[10px] text-gray-400 font-normal">{t.transUnit || selectedHistoryItem.unit}</span>
                                                </td>
                                                <td className="p-3 text-xs">
                                                    <div className="font-bold text-gray-700">{t.building}</div>
                                                    <div className="text-gray-400">{t.reference}</div>
                                                </td>
                                                <td className="p-3 text-xs text-gray-600">{t.party}</td>
                                                <td className="p-3 text-xs text-gray-500 italic">{t.remarks}</td>
                                                <td className="p-3 text-center">
                                                    <div className="flex justify-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => startEditTransaction(t)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Correct/Edit Entry"
                                                        >
                                                            <Edit2 size={14}/>
                                                        </button>
                                                        <button 
                                                            onClick={() => requestDeleteTransaction(t.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete Entry"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {historyTransactions.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">No transactions recorded.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default ExternalStore;
