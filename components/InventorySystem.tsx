
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category } from '../types';
import { Plus, Search, AlertTriangle, Package, Trash2, Save, X, Edit2 } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface InventorySystemProps {
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
}

const InventorySystem: React.FC<InventorySystemProps> = ({ inventory, onUpdateInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Add Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // --- Delete Confirmation State ---
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null}>({
      isOpen: false, 
      id: null
  });
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
      itemCode: '',
      description: '',
      category: Category.HVAC,
      made: '',
      unit: 'pcs',
      requiredQty: 10,
      receivedQty: 0,
      issuedQty: 0,
      rackNo: '',
      remarks: ''
  });

  const handleInputChange = (field: keyof InventoryItem, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startAdd = () => {
      setEditId(null);
      setFormData({
        itemCode: '',
        description: '',
        category: Category.HVAC,
        made: '',
        unit: 'pcs',
        requiredQty: 10,
        receivedQty: 0,
        issuedQty: 0,
        rackNo: '',
        remarks: ''
      });
      setIsEditing(true);
  };

  const startEdit = (item: InventoryItem) => {
      setEditId(item.id);
      setFormData({ ...item });
      setIsEditing(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;

    if (editId) {
        // UPDATE EXISTING
        onUpdateInventory(inventory.map(item => item.id === editId ? { 
            ...item, 
            ...formData as InventoryItem, 
            lastUpdated: new Date().toISOString() 
        } : item));
    } else {
        // CREATE NEW
        const newItem: InventoryItem = {
            id: Math.random().toString(36).substr(2, 9),
            itemCode: formData.itemCode || '-',
            description: formData.description || '',
            category: formData.category || Category.HVAC,
            made: formData.made || '-',
            unit: formData.unit || 'pcs',
            requiredQty: Number(formData.requiredQty) || 0,
            receivedQty: Number(formData.receivedQty) || 0,
            issuedQty: Number(formData.issuedQty) || 0,
            rackNo: formData.rackNo || '-',
            remarks: formData.remarks || '-',
            lastUpdated: new Date().toISOString()
        };
        onUpdateInventory([...inventory, newItem]);
    }
    
    setIsEditing(false);
  };

  // --- DELETE LOGIC ---
  const requestDelete = (id: string) => {
      setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDelete = () => {
      if (deleteConfirm.id) {
          onUpdateInventory(inventory.filter(i => i.id !== deleteConfirm.id));
      }
      setDeleteConfirm({ isOpen: false, id: null });
  };

  // --- MEMOIZATION FOR PERFORMANCE ---
  const filteredInventory = useMemo(() => {
      return inventory.filter(item => 
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.rackNo.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [inventory, searchTerm]);

  const groupedInventory = useMemo(() => {
      const groups: Record<string, InventoryItem[]> = {};
      CATEGORIES.forEach(cat => groups[cat] = []);
      filteredInventory.forEach(item => {
          const cat = item.category as string;
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
      });
      return groups;
  }, [filteredInventory]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
        
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl shadow-md border border-gray-200">
             <div className="flex items-center gap-4">
                 <div className="bg-teal-800 p-3 rounded-lg text-white shadow-md">
                    <Package size={28} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Store Ledger</h2>
                    <p className="text-xs text-gray-500 font-medium">Inventory Management System</p>
                 </div>
             </div>
             
             <div className="relative flex-1 w-full md:max-w-lg">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search Store (Code, Name, Rack...)" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none shadow-sm transition-shadow"
                />
            </div>
            
            <button 
                onClick={startAdd}
                className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
                <Plus size={20} /> Add New Item
            </button>
        </div>

        {/* Add/Edit Modal Overlay */}
        {isEditing && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <div className="bg-teal-800 p-4 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            {editId ? <Edit2 size={20}/> : <Plus size={20}/>}
                            {editId ? 'Edit Stock Item' : 'Add New Stock Item'}
                        </h3>
                        <button onClick={() => setIsEditing(false)} className="text-teal-200 hover:text-white transition-colors"><X size={24}/></button>
                    </div>
                    
                    <form onSubmit={handleSaveItem} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        {/* Section 1: Basic Info */}
                        <div className="md:col-span-12">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1 mb-2">Item Details</h4>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                            <select 
                                value={formData.category}
                                onChange={(e) => handleInputChange('category', e.target.value)}
                                className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-teal-500 outline-none bg-gray-50"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="General">General</option>
                            </select>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Item Code</label>
                            <input type="text" value={formData.itemCode} onChange={e => handleInputChange('itemCode', e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="e.g. ELE-001"/>
                        </div>

                        <div className="md:col-span-6">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                            <input type="text" required value={formData.description} onChange={e => handleInputChange('description', e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 outline-none font-bold text-gray-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Item Name / Specs"/>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Made (Brand)</label>
                            <input type="text" value={formData.made} onChange={e => handleInputChange('made', e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="e.g. Philips"/>
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                            <input type="text" value={formData.unit} onChange={e => handleInputChange('unit', e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="e.g. pcs, box"/>
                        </div>
                        
                        <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Rack No.</label>
                            <input type="text" value={formData.rackNo} onChange={e => handleInputChange('rackNo', e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="e.g. A-01"/>
                        </div>

                         {/* Section 2: Quantities */}
                         <div className="md:col-span-12 mt-2">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1 mb-2">Inventory Levels</h4>
                        </div>

                        <div className="md:col-span-4 bg-gray-50 p-3 rounded border border-gray-200">
                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Minimum Required</label>
                            <input type="number" min="0" value={formData.requiredQty} onChange={e => handleInputChange('requiredQty', e.target.value)} className="w-full border border-gray-300 rounded p-2 outline-none text-center font-bold text-gray-800"/>
                        </div>
                        <div className="md:col-span-4 bg-blue-50/50 p-3 rounded border border-blue-100">
                            <label className="block text-[10px] font-bold text-blue-700 mb-1 uppercase">Total Received (In)</label>
                            <input type="number" min="0" value={formData.receivedQty} onChange={e => handleInputChange('receivedQty', e.target.value)} className="w-full border border-blue-200 rounded p-2 outline-none text-center text-blue-800 font-bold"/>
                        </div>
                        <div className="md:col-span-4 bg-red-50/50 p-3 rounded border border-red-100">
                            <label className="block text-[10px] font-bold text-red-700 mb-1 uppercase">Total Issued (Out)</label>
                            <input type="number" min="0" value={formData.issuedQty} onChange={e => handleInputChange('issuedQty', e.target.value)} className="w-full border border-red-200 rounded p-2 outline-none text-center text-red-800 font-bold"/>
                        </div>

                        <div className="md:col-span-12 mt-2">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-1 mb-2">Additional Info</h4>
                        </div>

                        <div className="md:col-span-12">
                            <label className="block text-xs font-bold text-gray-700 mb-1">Remarks</label>
                            <input type="text" value={formData.remarks} onChange={e => handleInputChange('remarks', e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Notes..."/>
                        </div>

                        <div className="md:col-span-12 flex justify-end gap-3 pt-4 border-t mt-2">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-bold transition-colors">Cancel</button>
                            <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-8 rounded-lg shadow-md transition-all flex items-center gap-2">
                                <Save size={18} /> {editId ? 'Update Item' : 'Save New Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* The Store Table */}
        <div className="bg-white shadow-lg rounded-lg border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-teal-900 to-teal-800 text-white">
                            <th className="p-4 text-xs font-bold border-r border-teal-700 w-12 tracking-wider">SL</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 tracking-wider">CODE</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 w-64 text-left pl-4 tracking-wider">DESCRIPTION</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 tracking-wider">MADE</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 w-16 tracking-wider">UNIT</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 bg-teal-950/30 tracking-wider">REQ</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 bg-blue-900/40 tracking-wider">REC</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 bg-red-900/40 tracking-wider">ISSUED</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 bg-emerald-600 tracking-wider">AVAIL</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 tracking-wider">RACK</th>
                            <th className="p-4 text-xs font-bold border-r border-teal-700 tracking-wider">REMARKS</th>
                            <th className="p-4 text-xs font-bold w-32 tracking-wider">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {CATEGORIES.map(category => {
                            const items = groupedInventory[category] || [];
                            
                            if (items.length === 0 && searchTerm) return null;
                            
                            return (
                                <React.Fragment key={category}>
                                    {/* Category Header */}
                                    {items.length > 0 && (
                                        <tr className="bg-gray-100 border-b border-gray-300">
                                            <td colSpan={12} className="py-2 px-4 text-left font-extrabold text-gray-600 uppercase tracking-widest text-[11px] border-t border-gray-300 bg-gradient-to-r from-gray-100 to-white">
                                                {category}
                                            </td>
                                        </tr>
                                    )}

                                    {items.map((item, idx) => {
                                        const available = (item.receivedQty || 0) - (item.issuedQty || 0);
                                        const isLow = available < item.requiredQty;

                                        return (
                                            <tr key={item.id} className={`border-b border-gray-200 hover:bg-teal-50/20 transition-colors group ${isLow ? 'bg-red-50/60' : ''}`}>
                                                <td className="p-3 text-sm text-gray-500 border-r border-gray-200 font-mono">{idx + 1}</td>
                                                <td className="p-3 text-sm font-semibold border-r border-gray-200 text-teal-700 font-mono">{item.itemCode}</td>
                                                <td className="p-3 text-sm font-bold border-r border-gray-200 text-left text-gray-800" style={{fontFamily: 'Calibri', fontSize: '15px'}}>
                                                    {item.description}
                                                    {isLow && <div className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-bold animate-pulse"><AlertTriangle size={10}/> LOW STOCK</div>}
                                                </td>
                                                <td className="p-3 text-sm text-gray-600 border-r border-gray-200 font-medium">{item.made}</td>
                                                <td className="p-3 text-xs text-gray-500 border-r border-gray-200 lowercase">{item.unit}</td>
                                                
                                                {/* QTY Columns */}
                                                <td className="p-3 text-sm font-bold border-r border-gray-200 bg-gray-50/50 text-gray-600">{item.requiredQty}</td>
                                                <td className="p-3 text-sm font-bold border-r border-gray-200 text-blue-700 bg-blue-50/20">{item.receivedQty}</td>
                                                <td className="p-3 text-sm font-bold border-r border-gray-200 text-red-700 bg-red-50/20">{item.issuedQty}</td>
                                                <td className={`p-3 text-base font-extrabold border-r border-gray-200 ${available <= 0 ? 'text-red-600' : 'text-emerald-700'} bg-emerald-50/30`}>
                                                    {available}
                                                </td>

                                                <td className="p-3 text-sm text-gray-700 border-r border-gray-200 font-medium">{item.rackNo}</td>
                                                <td className="p-3 text-sm text-gray-500 border-r border-gray-200 italic">{item.remarks}</td>
                                                
                                                <td className="p-2">
                                                    <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => startEdit(item)} 
                                                            className="text-gray-500 hover:text-teal-600 hover:bg-teal-50 p-1.5 rounded transition-colors" 
                                                            title="Edit Item"
                                                        >
                                                            <Edit2 size={16}/>
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                requestDelete(item.id);
                                                            }}
                                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors relative z-10" 
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                
                {inventory.length === 0 && (
                    <div className="text-center py-20 bg-gray-50">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-gray-500 font-bold">Store is Empty</h3>
                        <p className="text-gray-400 text-sm mt-1">Add items to start tracking inventory</p>
                    </div>
                )}
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
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Ledger Item?</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete this item? This action is irreversible.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setDeleteConfirm({isOpen: false, id: null})}
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
    </div>
  );
};

export default InventorySystem;
