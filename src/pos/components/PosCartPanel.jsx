import { useState } from 'react';

export default function PosCartPanel({ 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  orderType,
  setOrderType,
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  discountAmount,
  setDiscountAmount,
  onProceedToCheckout 
}) {
  const [discountType, setDiscountType] = useState('FIXED'); // 'FIXED' or 'PERCENT'

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Compute discount value
  let discountVal = parseFloat(discountAmount) || 0;
  if (discountType === 'PERCENT') {
    discountVal = (subtotal * discountVal) / 100;
  }
  discountVal = Math.min(subtotal, Math.max(0, discountVal));

  const taxableAmount = Math.max(0, subtotal - discountVal);
  const gstTax = Math.round(taxableAmount * 0.05); // 5% GST
  const finalTotal = Math.round(taxableAmount + gstTax);

  return (
    <div className="w-full h-full bg-slate-900 flex flex-col justify-between shrink-0 overflow-hidden shadow-2xl">
      
      {/* Top Header & Ticket Info */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        
        {/* Ticket Title & Order Type Pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">🎟️</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Current Ticket</h2>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Order Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {[
            { id: 'DINE_IN', label: '🍽️ Dine-In' },
            { id: 'TAKEAWAY', label: '🛍️ Takeaway' },
            { id: 'COUNTER', label: '⚡ Counter' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setOrderType(type.id)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                orderType === type.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Dine-In Table Selector / Customer Inputs */}
        <div className="flex gap-2">
          {orderType === 'DINE_IN' && (
            <div className="w-1/3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Table #
              </label>
              <input
                type="text"
                placeholder="T-01"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-400 font-bold text-center focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className={orderType === 'DINE_IN' ? 'w-2/3' : 'w-full'}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Customer Name / Phone (Optional)
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Guest / Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Phone #"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-1/2 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/50">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
            <span className="text-4xl mb-2">🛒</span>
            <p className="text-xs font-bold text-slate-400">Active Ticket is Empty</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Tap menu items on the left to start billing</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="pt-2.5 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                <div className="text-[11px] text-slate-400 font-mono">
                  ₹{item.price} x {item.quantity} = <span className="font-bold text-amber-400">₹{item.price * item.quantity}</span>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Remove button */}
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-slate-500 hover:text-rose-400 text-xs p-1"
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Financial Summary & Checkout Button */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3 shrink-0">
        
        {/* Discount Input */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Apply Discount</span>
          <div className="flex items-center space-x-1">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1 py-0.5 focus:outline-none"
            >
              <option value="FIXED">₹ Fixed</option>
              <option value="PERCENT">% Off</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="w-16 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-right text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Calculations Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          {discountVal > 0 && (
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>Discount</span>
              <span>-₹{Math.round(discountVal)}</span>
            </div>
          )}

          <div className="flex justify-between text-slate-400">
            <span>GST (5%)</span>
            <span>₹{gstTax}</span>
          </div>

          <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
            <span>Total Payable</span>
            <span className="text-amber-400 text-xl font-mono">₹{finalTotal}</span>
          </div>
        </div>

        {/* Pay Button */}
        <button
          disabled={cartItems.length === 0}
          onClick={() => onProceedToCheckout({ subtotal, discountVal, gstTax, finalTotal })}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-base tracking-wide shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>💳 PAY & CHARGE</span>
          <span className="font-mono text-sm bg-slate-950/20 px-2 py-0.5 rounded">₹{finalTotal}</span>
        </button>

      </div>

    </div>
  );
}
