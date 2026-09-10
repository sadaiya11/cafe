import React, { useState } from 'react';

const STORAGE_KEY = 'bun_maska_raw_inventory';

const defaultInventory = [
  { id: '1', name: 'Amul Butter Blocks (500g)', qty: 14, minLevel: 10, unit: 'Blocks', status: 'OK' },
  { id: '2', name: 'Fresh Bun Packs (12 pcs)', qty: 4, minLevel: 10, unit: 'Packs', status: 'LOW' },
  { id: '3', name: 'Assam Chai Tea Leaves', qty: 8, minLevel: 5, unit: 'kg', status: 'OK' },
  { id: '4', name: 'Whole Cow Milk', qty: 3, minLevel: 15, unit: 'Liters', status: 'LOW' },
  { id: '5', name: 'Refined Sugar Bags', qty: 25, minLevel: 10, unit: 'kg', status: 'OK' },
  { id: '6', name: 'Processed Cheese Slices', qty: 2, minLevel: 5, unit: 'Packs', status: 'LOW' },
];

export default function InventoryManagerView() {
  const [inventory, setInventory] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultInventory;
    } catch {
      return defaultInventory;
    }
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemMin, setNewItemMin] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('Units');
  const [notice, setNotice] = useState('');

  const saveState = (updated) => {
    setInventory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleRestock = (id, addAmount = 10) => {
    const updated = inventory.map(item => {
      if (item.id === id) {
        const nextQty = item.qty + addAmount;
        return {
          ...item,
          qty: nextQty,
          status: nextQty <= item.minLevel ? 'LOW' : 'OK'
        };
      }
      return item;
    });
    saveState(updated);
    setNotice('Stock updated!');
  };

  const handleCreateIngredient = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setNotice('Please enter ingredient name.');
      return;
    }
    const q = parseFloat(newItemQty) || 0;
    const m = parseFloat(newItemMin) || 5;

    const newItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      qty: q,
      minLevel: m,
      unit: newItemUnit,
      status: q <= m ? 'LOW' : 'OK'
    };

    const updated = [newItem, ...inventory];
    saveState(updated);

    setNewItemName('');
    setNewItemQty('');
    setNewItemMin('');
    setNotice(`✅ "${newItem.name}" added to raw inventory!`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Remove ingredient item?')) {
      const updated = inventory.filter(i => i.id !== id);
      saveState(updated);
    }
  };

  const lowStockCount = inventory.filter(i => i.qty <= i.minLevel).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Raw Ingredients & Inventory Manager</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor raw kitchen stock (butter, tea leaves, milk, buns) and receive low-stock alerts.
          </p>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 px-3.5 py-1.5 rounded-xl text-rose-400 text-xs font-bold animate-pulse">
            <span>⚠️</span>
            <span>{lowStockCount} Item(s) Require Restock!</span>
          </div>
        )}
      </div>

      {notice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold">
          {notice}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-6">
        
        {/* Add Raw Ingredient Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">➕ Add Raw Ingredient Item</h3>
          
          <form onSubmit={handleCreateIngredient} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Ingredient Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cardamom Pods (Elaichi)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Qty *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="10"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Min Alert *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="5"
                  value={newItemMin}
                  onChange={(e) => setNewItemMin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Unit</label>
                <select
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Units">Units</option>
                  <option value="kg">kg</option>
                  <option value="Liters">Liters</option>
                  <option value="Packs">Packs</option>
                  <option value="Blocks">Blocks</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md shadow-amber-500/10"
            >
              ✓ Add to Inventory
            </button>
          </form>
        </div>

        {/* Inventory Items List */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-semibold">Raw Ingredient</th>
                  <th className="py-3.5 px-4 font-semibold">Stock Qty</th>
                  <th className="py-3.5 px-4 font-semibold">Min Threshold</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {inventory.map((item) => {
                  const isLow = item.qty <= item.minLevel;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white text-xs">
                        {item.name}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-sm text-amber-400">
                        {item.qty} {item.unit}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {item.minLevel} {item.unit}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-fit animate-pulse">
                            ⚠️ LOW STOCK
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit block">
                            ✓ OK
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleRestock(item.id, 10)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-700"
                        >
                          + Restock (+10)
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-500 hover:text-rose-400 text-xs p-1"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
