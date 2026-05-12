import React, { useState, useMemo } from 'react';
import { InventoryItem, ExternalTransaction } from '../types';
import { TOWERS } from '../constants';
import { 
  ArrowUpRight, HardHat, Search, X, 
  Building2, User, IdCard, Calendar, 
  Scale, Filter, Trash2, Edit2, RotateCcw, AlertTriangle
} from 'lucide-react';

interface ExternalWithdrawalsProps {
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  transactions: ExternalTransaction[];
  onUpdateTransactions: (t: ExternalTransaction[]) => void;
}

const ExternalWithdrawals: React.FC<ExternalWithdrawalsProps> = ({ inventory, onUpdateInventory, transactions, onUpdateTransactions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransId, setEditingTransId] = useState<string | null>(null);

  // --- Delete Modal State ---
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, trans: ExternalTransaction | null}>({
      isOpen: false, 
      trans: null
  });

  // Filters for Log Table
  const [filterTower, setFilterTower] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [filterQty, setFilterQty] = useState('');

  // Form State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [form, setForm] = useState({
      quantity: '' as any,
      transUnit: '',
      building: TOWERS[0] as any,
      reference: '', // Floor/Site
      party: '', // Receiver Name
      companyId: '',
      remarks: '',
      date: new Date().toISOString().split('T')[0]
  });

  // --- Helpers ---
  const recalculateItemTotals = (targetItemId: string, currentTransactions: ExternalTransaction[]) => {
      const itemTrans = currentTransactions.filter(t => t.itemId === targetItemId);
      const totalReceived = itemTrans.filter(t => t.type === 'IN').reduce((acc: number, t) => acc + Number(t.quantity), 0);
      const totalIssued = itemTrans.filter(t => t.type === 'OUT').reduce((acc: number, t) => acc + Number(t.quantity), 0);
      
      onUpdateInventory(inventory.map(item => {
          if (item.id === targetItemId) {
              return {
                  ...item,
                  receivedQty: totalReceived,
                  issuedQty: totalIssued,
                  lastUpdated: new Date().toISOString()
              };
          }
          return item;
      }));
  };

  const clearFilters = () => {
      setFilterTower('ALL');
      setFilterDateFrom('');
      setFilterDateTo('');
      setFilterTech('');
      setFilterQty('');
      setSearchTerm('');
  };

  // --- Actions ---
  const openNewWithdrawal = () => {
      setEditingTransId(null);
      setSelectedItemId('');
      setItemSearch('');
      setForm({
          quantity: '',
          transUnit: '',
          building: TOWERS[0],
          reference: '',
          party: '',
          companyId: '',
          remarks: '',
          date: new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(true);
  };

  const openEditWithdrawal = (trans: ExternalTransaction) => {
      setEditingTransId(trans.id);
      setSelectedItemId(trans.itemId);
      const item = inventory.find(i => i.id === trans.itemId);
      setItemSearch(item ? item.description : '');
      setForm({
          quantity: trans.quantity,
          transUnit: trans.transUnit,
          building: trans.building,
          reference: trans.reference,
          party: trans.party,
          companyId: trans.companyId,
          remarks: trans.remarks,
          date: trans.date
      });
      setIsModalOpen(true);
  };

  const requestDelete = (trans: ExternalTransaction) => {
      setDeleteConfirm({ isOpen: true, trans });
  };

  const confirmDelete = () => {
      if (!deleteConfirm.trans) return;
      const trans = deleteConfirm.trans;
      
      const updated = transactions.filter(t => t.id !== trans.id);
      onUpdateTransactions(updated);
      recalculateItemTotals(trans.itemId, updated);

      setDeleteConfirm({ isOpen: false, trans: null });
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedItemId || !form.quantity || Number(form.quantity) <= 0) return;

      const item = inventory.find(i => i.id === selectedItemId);
      if (!item) return;

      let updatedTransactions = [...transactions];
      const qty = parseFloat(String(form.quantity));

      if (editingTransId) {
          updatedTransactions = transactions.map(t => t.id === editingTransId ? {
              ...t,
              itemId: selectedItemId,
              quantity: qty,
              transUnit: form.transUnit || item.unit,
              building: form.building as any,
              reference: form.reference || '-',
              party: form.party || '-',
              companyId: form.companyId || '-',
              remarks: form.remarks || '-',
              date: form.date
          } : t);
      } else {
           const newTrans: ExternalTransaction = {
              id: Math.random().toString(36).substr(2, 9),
              itemId: selectedItemId,
              type: 'OUT',
              quantity: qty,
              transUnit: form.transUnit || item.unit,
              building: form.building as any,
              reference: form.reference || '-',
              party: form.party || '-',
              companyId: form.companyId || '-',
              remarks: form.remarks || '-',
              date: form.date,
              timestamp: Date.now()
          };
          updatedTransactions = [newTrans, ...updatedTransactions];
      }

      onUpdateTransactions(updatedTransactions);
      recalculateItemTotals(selectedItemId, updatedTransactions);
      setIsModalOpen(false);
  };

  const filteredTransactions = useMemo(() => {
      return transactions
        .filter(t => t.type === 'OUT') 
        .filter(t => {
            const item = inventory.find(i => i.id === t.itemId);
            const itemName = item ? item.description.toLowerCase() : '';
            const receiver = t.party.toLowerCase();
            const search = searchTerm.toLowerCase();
            
            // Global Search (matches item, receiver, building, reference)
            const matchesSearch = 
                itemName.includes(search) || 
                receiver.includes(search) || 
                t.building.toLowerCase().includes(search) ||
                (t.reference && t.reference.toLowerCase().includes(search));

            // Specific Filters
            const matchesTower = filterTower === 'ALL' || t.building === filterTower;
            
            let matchesDate = true;
            if (filterDateFrom) matchesDate = matchesDate && t.date >= filterDateFrom;
            if (filterDateTo) matchesDate = matchesDate && t.date <= filterDateTo;

            let matchesTech = true;
            if (filterTech) matchesTech = receiver.includes(filterTech.toLowerCase());

            let matchesQty = true;
            if (filterQty) matchesQty = Number(t.quantity) === Number(filterQty);

            return matchesSearch && matchesTower && matchesDate && matchesTech && matchesQty;
        })
        .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, inventory, searchTerm, filterTower, filterDateFrom, filterDateTo, filterTech, filterQty]);

  const itemSearchResults = useMemo(() => {
      if (!itemSearch) return [];
      return inventory.filter(i => i.description.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [inventory, itemSearch]);

  const hasActiveFilters = filterTower !== 'ALL' || filterDateFrom || filterDateTo || filterTech || filterQty;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
        
        {/* Header */}
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                 <div className="bg-red-600 p-3 rounded-lg text-white shadow-md">
                    <HardHat size={28} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Site Withdrawals</h2>
                    <p className="text-xs text-gray-500">Technician Material Consumption Log</p>
                 </div>
             </div>
             
             <div className="flex flex-1 w-full md:w-auto gap-3 items-center justify-end">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search logs (Item, Site, Name)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    />
                </div>
                <button 
                    onClick={openNewWithdrawal}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md whitespace-nowrap"
                >
                    <ArrowUpRight size={18} /> New Withdrawal
                </button>
             </div>
        </div>

        {/* --- WITHDRAWALS LOG TABLE --- */}
        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
             
             {/* Filter Bar */}
             <div className="p-4 border-b border-gray-200 bg-gray-50">
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    
                    {/* Tower Filter */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Filter size={10}/> Tower</label>
                        <select 
                            value={filterTower}
                            onChange={(e) => setFilterTower(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-2 bg-white outline-none focus:border-red-500 cursor-pointer"
                        >
                            <option value="ALL">All Towers</option>
                            {TOWERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={10}/> Date From</label>
                        <input 
                            type="date" 
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white outline-none focus:border-red-500 cursor-pointer"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={10}/> Date To</label>
                        <input 
                            type="date" 
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white outline-none focus:border-red-500 cursor-pointer"
                        />
                    </div>

                    {/* Technician Name */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><User size={10}/> Technician</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={filterTech}
                                onChange={(e) => setFilterTech(e.target.value)}
                                placeholder="Filter by Name..."
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white outline-none focus:border-red-500"
                            />
                        </div>
                    </div>

                     {/* Quantity */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Scale size={10}/> Exact Qty</label>
                        <input 
                            type="number" step="any"
                            value={filterQty}
                            onChange={(e) => setFilterQty(e.target.value)}
                            placeholder="0"
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white outline-none focus:border-red-500"
                        />
                    </div>
                 </div>

                 {/* Active Filters Summary / Clear */}
                 {hasActiveFilters && (
                     <div className="mt-3 flex justify-end">
                        <button 
                            onClick={clearFilters}
                            className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-full font-bold flex items-center gap-1 transition-colors border border-red-100"
                        >
                            <RotateCcw size={10} /> Reset Filters
                        </button>
                     </div>
                 )}
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-red-50 text-red-900 text-xs uppercase font-bold border-b border-red-100">
                        <tr>
                            <th className="p-4 w-32">Date</th>
                            <th className="p-4 w-64">Item</th>
                            <th className="p-4 w-24">Qty</th>
                            <th className="p-4 w-40">Tower</th>
                            <th className="p-4">Receiver (Tech)</th>
                            <th className="p-4">Floor/Site</th>
                            <th className="p-4 w-32 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredTransactions.map((log) => {
                            const item = inventory.find(i => i.id === log.itemId);
                            return (
                                <tr key={log.id} className="hover:bg-red-50/30 transition-colors">
                                    <td className="p-4 text-gray-600 font-mono text-xs">{log.date}</td>
                                    <td className="p-4 font-bold text-gray-800">
                                        {item ? item.description : 'Unknown Item'}
                                        <div className="text-[10px] text-gray-400 font-normal">{item?.itemCode}</div>
                                    </td>
                                    <td className="p-4 font-bold text-red-700">
                                        {log.quantity} <span className="text-xs text-gray-500 font-normal">{log.transUnit}</span>
                                    </td>
                                    <td className="p-4 font-medium text-gray-700">{log.building}</td>
                                    <td className="p-4 text-gray-700">
                                        <div>{log.party}</div>
                                        {log.companyId && <div className="text-[10px] text-gray-400">ID: {log.companyId}</div>}
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs">{log.reference}</td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditWithdrawal(log);
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    requestDelete(log);
                                                }} 
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTransactions.length === 0 && (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">
                                {hasActiveFilters ? 'No withdrawals match your filters.' : 'No withdrawals recorded.'}
                            </td></tr>
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
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Withdrawal?</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete this record? This will <b>restore the quantity</b> back to the inventory.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setDeleteConfirm({isOpen: false, trans: null})}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-lg"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 flex justify-between items-center text-white bg-red-600 shrink-0">
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <ArrowUpRight size={24}/> {editingTransId ? 'Edit Withdrawal' : 'New Withdrawal'}
                        </h3>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white"><X size={24}/></button>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                        
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-600 mb-1">SELECT ITEM</label>
                            {selectedItemId && !editingTransId ? (
                                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div>
                                        <div className="font-bold text-gray-800">{inventory.find(i => i.id === selectedItemId)?.description}</div>
                                        <div className="text-xs text-gray-500">Available: {(() => {
                                            const i = inventory.find(x => x.id === selectedItemId);
                                            return i ? (Number(i.receivedQty) - Number(i.issuedQty)).toFixed(2) : 0;
                                        })()} {inventory.find(i => i.id === selectedItemId)?.unit}</div>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedItemId(''); setItemSearch(''); }} className="text-red-600 text-xs font-bold hover:underline">CHANGE</button>
                                </div>
                            ) : (
                                <div>
                                    <input 
                                        type="text" 
                                        value={itemSearch}
                                        onChange={e => setItemSearch(e.target.value)}
                                        placeholder="Type to search item..."
                                        className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-500"
                                        disabled={!!editingTransId} 
                                    />
                                    {itemSearch && !selectedItemId && (
                                        <div className="absolute z-10 w-full bg-white border shadow-lg max-h-40 overflow-auto mt-1 rounded-md">
                                            {itemSearchResults.map(i => (
                                                <div 
                                                    key={i.id} 
                                                    onClick={() => { setSelectedItemId(i.id); setItemSearch(i.description); setForm({...form, transUnit: i.unit}); }}
                                                    className="p-2 hover:bg-red-50 cursor-pointer text-sm border-b"
                                                >
                                                    <div className="font-bold">{i.description}</div>
                                                    <div className="text-xs text-gray-500">Code: {i.itemCode} | Bal: {Number(i.receivedQty) - Number(i.issuedQty)}</div>
                                                </div>
                                            ))}
                                            {itemSearchResults.length === 0 && <div className="p-2 text-xs text-gray-400">No items found</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">QUANTITY</label>
                                <input 
                                    type="number" step="any" required autoFocus
                                    value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} 
                                    className="w-full border-2 p-3 rounded-lg text-xl font-bold text-center outline-none border-red-200 focus:border-red-500 text-red-700"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Scale size={12}/> UNIT</label>
                                <input 
                                    type="text" 
                                    value={form.transUnit} onChange={e => setForm({...form, transUnit: e.target.value})}
                                    className="w-full border p-3 rounded-lg text-center bg-gray-50 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Building2 size={12}/> DESTINATION TOWER</label>
                            <select 
                                value={form.building} onChange={e => setForm({...form, building: e.target.value as any})}
                                className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                                {TOWERS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><User size={12}/> RECEIVER (TECH)</label>
                                <input type="text" value={form.party} onChange={e => setForm({...form, party: e.target.value})} className="w-full border p-2 rounded outline-none text-sm" placeholder="Name"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><IdCard size={12}/> COMPANY ID</label>
                                <input type="text" value={form.companyId} onChange={e => setForm({...form, companyId: e.target.value})} className="w-full border p-2 rounded outline-none text-sm" placeholder="Badge #"/>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Calendar size={12}/> DATE</label>
                                <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border p-2 rounded outline-none text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">FLOOR / SITE / WO</label>
                                <input type="text" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} className="w-full border p-2 rounded outline-none text-sm" placeholder="e.g. 30th Floor"/>
                            </div>
                        </div>
                        
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">REMARKS</label>
                            <input type="text" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} className="w-full border p-2 rounded outline-none text-sm" placeholder="Optional notes..."/>
                        </div>

                        <button type="submit" className="w-full py-3 rounded-lg font-bold text-white shadow-lg bg-red-600 hover:bg-red-700 mt-4">
                            CONFIRM WITHDRAWAL
                        </button>

                    </form>
                </div>
            </div>
        )}

    </div>
  );
};

export default ExternalWithdrawals;