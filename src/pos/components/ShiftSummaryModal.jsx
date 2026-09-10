export default function ShiftSummaryModal({ shiftOrders, onClose, shiftStartTime }) {
  const totalOrders = shiftOrders.length;
  
  const totalCash = shiftOrders
    .filter(o => o.paymentMethod === 'CASH')
    .reduce((sum, o) => sum + (o.finalTotal || o.totalAmount || 0), 0);

  const totalUpi = shiftOrders
    .filter(o => o.paymentMethod === 'UPI')
    .reduce((sum, o) => sum + (o.finalTotal || o.totalAmount || 0), 0);

  const totalCard = shiftOrders
    .filter(o => o.paymentMethod === 'CARD')
    .reduce((sum, o) => sum + (o.finalTotal || o.totalAmount || 0), 0);

  const grandTotal = totalCash + totalUpi + totalCard;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Shift Z-Report Summary
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">Counter Shift Register</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold">
            ✕ Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span>Shift Started: <strong className="text-white">{shiftStartTime || 'Today 09:00 AM'}</strong></span>
            <span className="text-amber-400 font-bold">{totalOrders} Orders Billed</span>
          </div>

          {/* Grand Revenue Total Card */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center relative overflow-hidden">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Shift Revenue</span>
            <div className="text-3xl font-black text-amber-400 tracking-tight mt-1">
              ₹{grandTotal.toLocaleString('en-IN')}
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl"></div>
          </div>

          {/* Payment Method Counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">💵 Cash</span>
              <span className="text-base font-black text-white">₹{totalCash}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">📲 UPI QR</span>
              <span className="text-base font-black text-emerald-400">₹{totalUpi}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">💳 Card/POS</span>
              <span className="text-base font-black text-purple-400">₹{totalCard}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            🖨️ Print Shift Report
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10"
          >
            Resume Billing ➔
          </button>
        </div>

      </div>
    </div>
  );
}
