export default function AdminHeader({ 
  soundEnabled, 
  onToggleSound, 
  onTestSound, 
  onRefresh, 
  isRefreshing, 
  activeOrdersCount,
  searchTerm,
  setSearchTerm 
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title and Live Status */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
            ☕
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Bun Maska Admin</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time Order Desk & Payment Ledger</p>
          </div>
        </div>

        {/* Search Bar & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative min-w-[220px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search Order #, Customer, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active Orders Badge */}
          {activeOrdersCount > 0 && (
            <div className="flex items-center px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-semibold">
              <span className="mr-1.5 animate-bounce">🔥</span>
              <span>{activeOrdersCount} Active</span>
            </div>
          )}

          {/* Sound Alert Toggle Button */}
          <button
            onClick={onToggleSound}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              soundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
            title={soundEnabled ? "Order Alert Sound Enabled" : "Order Alert Sound Muted"}
          >
            <span>{soundEnabled ? '🔔 Sound ON' : '🔕 Muted'}</span>
          </button>

          {/* Test Sound Button */}
          {soundEnabled && (
            <button
              onClick={onTestSound}
              className="px-2.5 py-2 rounded-xl text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
              title="Test notification audio chime"
            >
              🔊 Test Chime
            </button>
          )}

          {/* Manual Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all disabled:opacity-50 shadow-md shadow-amber-500/10"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
