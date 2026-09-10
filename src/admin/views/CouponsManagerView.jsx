import React, { useState } from 'react';
import { getCoupons, saveCoupons } from '../../services/couponService';

export default function CouponsManagerView() {
  const [coupons, setCoupons] = useState(getCoupons);
  const [code, setCode] = useState('');
  const [type, setType] = useState('PERCENT'); // 'PERCENT' or 'FLAT'
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');

  const handleCreateCoupon = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setNotice('Please enter a coupon code.');
      return;
    }
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      setNotice('Please enter a valid discount value.');
      return;
    }

    const newCoupon = {
      code: code.trim().toUpperCase(),
      type,
      value: numVal,
      minOrder: parseFloat(minOrder) || 0,
      description: description.trim() || `${type === 'PERCENT' ? `${numVal}% OFF` : `Flat ₹${numVal} OFF`} on orders above ₹${minOrder || 0}`,
      active: true
    };

    const updated = [newCoupon, ...coupons.filter(c => c.code !== newCoupon.code)];
    setCoupons(updated);
    saveCoupons(updated);

    setCode('');
    setValue('');
    setMinOrder('');
    setDescription('');
    setNotice(`✅ Coupon "${newCoupon.code}" created successfully!`);
  };

  const toggleActive = (couponCode) => {
    const updated = coupons.map(c => c.code === couponCode ? { ...c, active: !c.active } : c);
    setCoupons(updated);
    saveCoupons(updated);
  };

  const handleDelete = (couponCode) => {
    if (window.confirm(`Delete coupon "${couponCode}"?`)) {
      const updated = coupons.filter(c => c.code !== couponCode);
      setCoupons(updated);
      saveCoupons(updated);
      setNotice(`🗑️ Coupon "${couponCode}" deleted.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Coupons & Promo Codes Manager</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Create promotional discount codes for customer checkout.
        </p>
      </div>

      {notice && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${
          notice.includes('deleted') ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {notice}
        </div>
      )}

      {/* Grid: Create Form + Coupons List */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
        
        {/* Create Coupon Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">➕ Create New Promo Coupon</h3>
          
          <form onSubmit={handleCreateCoupon} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. FESTIVE30"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-400 font-bold uppercase tracking-wider focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Discount Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="PERCENT">% Percentage Off</option>
                  <option value="FLAT">₹ Flat Off</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Discount Value *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder={type === 'PERCENT' ? 'e.g. 20 (%)' : 'e.g. 50 (₹)'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Min Order Subtotal (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Description / Banner Note</label>
              <input
                type="text"
                placeholder="e.g. Get 20% off on orders above ₹150"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md shadow-amber-500/10"
            >
              ✓ Publish Coupon Code
            </button>
          </form>
        </div>

        {/* Existing Coupons Table / Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Active Promo Coupons ({coupons.length})</h3>

          <div className="space-y-3">
            {coupons.map((c) => (
              <div 
                key={c.code}
                className={`bg-slate-900/90 border rounded-2xl p-4 flex items-center justify-between transition ${
                  c.active ? 'border-slate-800' : 'border-slate-800/40 opacity-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-amber-400 text-base bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      {c.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{c.description}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Discount: {c.type === 'PERCENT' ? `${c.value}%` : `₹${c.value}`} | Min Order: ₹{c.minOrder || 0}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleActive(c.code)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
                      c.active 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {c.active ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={() => handleDelete(c.code)}
                    className="p-1 text-slate-500 hover:text-rose-400 text-xs"
                    title="Delete Coupon"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
