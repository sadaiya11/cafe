import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PosHeader({ 
  cartCount, 
  onOpenShiftSummary, 
  onResetCart,
  cashierName = 'Counter Staff' 
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-3 md:px-6 py-2 md:py-3 flex items-center justify-between shrink-0 shadow-md">
      {/* Brand & Mode Title */}
      <div className="flex items-center space-x-2 md:space-x-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-base md:text-xl shadow-lg shadow-amber-500/20">
          ☕
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <h1 className="text-sm md:text-lg font-bold tracking-tight text-white">Bun Maska POS</h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              COUNTER BILLING
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-400 font-mono leading-none mt-0.5">{timeStr}</p>
        </div>
      </div>

      {/* Center Cashier Badge (Desktop) */}
      <div className="hidden lg:flex items-center space-x-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="text-slate-400">Cashier:</span>
        <span className="font-bold text-amber-400">{cashierName}</span>
      </div>

      {/* Actions & Quick Navigation */}
      <div className="flex items-center space-x-1.5 md:space-x-2.5">
        {/* Reset Cart */}
        {cartCount > 0 && (
          <button
            onClick={onResetCart}
            className="px-2.5 md:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-slate-700 text-xs font-semibold transition-all"
            title="Clear Active Ticket"
          >
            🗑️ <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* Shift Z-Report Summary */}
        <button
          onClick={onOpenShiftSummary}
          className="flex items-center space-x-1 px-2.5 md:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          title="Daily Shift & Register Summary"
        >
          <span>📊</span>
          <span className="hidden sm:inline">Shift Report</span>
        </button>

        {/* Quick link to Admin Desk */}
        <Link
          to="/admin"
          className="flex items-center space-x-1 px-2.5 md:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10"
        >
          <span>👑</span>
          <span className="hidden sm:inline">Admin Desk</span>
        </Link>
      </div>
    </header>
  );
}
