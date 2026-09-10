import { Link } from 'react-router-dom';

export default function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  ordersCount, 
  productsCount, 
  totalRevenue 
}) {
  const navItems = [
    {
      id: 'orders',
      label: 'Orders Desk',
      icon: '📋',
      badge: ordersCount > 0 ? ordersCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      desc: 'Live customer orders'
    },
    {
      id: 'products',
      label: 'Products Catalog',
      icon: '🍔',
      badge: productsCount,
      badgeColor: 'bg-slate-800 text-slate-300',
      desc: 'Food menu & stock'
    },
    {
      id: 'payments',
      label: 'Payments & Revenue',
      icon: '💳',
      badge: null,
      desc: 'Razorpay & COD transactions'
    },
    {
      id: 'analytics',
      label: 'Sales Analytics',
      icon: '📊',
      badge: null,
      desc: 'Charts & revenue trends'
    },
    {
      id: 'coupons',
      label: 'Coupons & Promos',
      icon: '🎟️',
      badge: null,
      desc: 'Manage discount codes'
    },
    {
      id: 'inventory',
      label: 'Raw Inventory',
      icon: '🧈',
      badge: null,
      desc: 'Stock alerts & materials'
    },
    {
      id: 'settings',
      label: 'Store Settings',
      icon: '⚙️',
      badge: null,
      desc: 'Rates, banners & open/close'
    },
    {
      id: 'reviews',
      label: 'Food Reviews',
      icon: '⭐',
      badge: null,
      desc: 'Moderate customer ratings'
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col justify-between shrink-0 p-4 min-h-[calc(100vh-73px)]">
      <div className="space-y-6">
        
        {/* Navigation Category Heading */}
        <div>
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Management
          </p>
          
          <nav className="mt-3 space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold shadow-inner'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="text-sm leading-tight">{item.label}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{item.desc}</div>
                    </div>
                  </div>

                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* POS Terminal Fast Link */}
            <Link
              to="/pos"
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 mt-3"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">🛍️</span>
                <div>
                  <div className="text-sm font-bold leading-tight">POS Billing Counter</div>
                  <div className="text-[11px] text-amber-400/70 font-normal">Touch billing & receipts</div>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                OPEN ➔
              </span>
            </Link>
          </nav>
        </div>

        {/* Quick Revenue Summary Widget */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Total Sales</span>
            <span className="text-emerald-400 font-medium">💰 Live</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full w-3/4 rounded-full"></div>
          </div>
          <p className="text-[11px] text-slate-500">Includes Razorpay UPI/Cards & Cash on Delivery</p>
        </div>

      </div>

      {/* Footer info */}
      <div className="pt-4 border-t border-slate-800/80 px-2 text-center text-[11px] text-slate-500">
        <p className="font-semibold text-slate-400">Bun Maska Café Admin v1.0</p>
        <p className="mt-0.5">Vite + React + Tailwind CSS</p>
      </div>
    </aside>
  );
}
