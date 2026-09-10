import React from 'react';

export default function AnalyticsDashboardView({ orders = [] }) {
  // Financial metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount || o.total || o.amount) || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Payment Breakdown
  const razorpayTotal = orders
    .filter(o => (o.paymentMethod || '').toUpperCase() === 'RAZORPAY' || o.paymentStatus === 'PAID_ONLINE')
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount || o.total || o.amount) || 0), 0);

  const codTotal = orders
    .filter(o => (o.paymentMethod || '').toUpperCase() === 'COD')
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount || o.total || o.amount) || 0), 0);

  const posTotal = orders
    .filter(o => (o.paymentMethod || '').toUpperCase() === 'CASH' || (o.paymentMethod || '').toUpperCase() === 'UPI' || (o.paymentMethod || '').toUpperCase() === 'CARD')
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount || o.total || o.amount) || 0), 0);

  // Popular Food Items counter
  const itemCounts = {};
  orders.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach(item => {
      const name = item.title || item.name || 'Bun Maska';
      itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
    });
  });

  const topSellingItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Sales & Revenue Analytics Dashboard</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time performance metrics, popular dish rankings, and revenue breakdowns.
        </p>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all channels</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
        </div>

        {/* Total Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <span className="text-lg">📦</span>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight mt-2">
            {totalOrders}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Completed & In Progress</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
        </div>

        {/* Avg Order Value */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Order Value</span>
            <span className="text-lg">📈</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight mt-2">
            ₹{avgOrderValue}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Per transaction check-out</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
        </div>

        {/* Store Health */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Store Rating</span>
            <span className="text-lg">⭐</span>
          </div>
          <div className="text-2xl font-black text-purple-400 tracking-tight mt-2">
            4.9 / 5.0
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Customer Feedback Score</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-purple-500/10 rounded-full blur-xl"></div>
        </div>

      </div>

      {/* Grid: Popular Items + Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Best-Selling Dishes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">🔥 Top 5 Best-Selling Dishes</h3>
            <span className="text-xs text-slate-400">By Qty Sold</span>
          </div>

          {topSellingItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No order analytics recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topSellingItems.map((item, idx) => {
                const maxCount = topSellingItems[0].count || 1;
                const pct = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-200">
                      <span>#{idx + 1} {item.name}</span>
                      <span className="text-amber-400 font-mono">{item.count} sold</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Channels Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">💳 Revenue by Payment Channel</h3>
            <span className="text-xs text-slate-400">Distribution</span>
          </div>

          <div className="space-y-4">
            {/* Razorpay */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">💳</span>
                <div>
                  <div className="text-xs font-bold text-white">Razorpay Online (UPI/Cards)</div>
                  <div className="text-[10px] text-slate-500">Customer web payments</div>
                </div>
              </div>
              <span className="text-sm font-black text-emerald-400 font-mono">₹{razorpayTotal}</span>
            </div>

            {/* COD */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">💵</span>
                <div>
                  <div className="text-xs font-bold text-white">Cash on Delivery (COD)</div>
                  <div className="text-[10px] text-slate-500">Delivery collection</div>
                </div>
              </div>
              <span className="text-sm font-black text-amber-400 font-mono">₹{codTotal}</span>
            </div>

            {/* POS */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-lg">🛍️</span>
                <div>
                  <div className="text-xs font-bold text-white">POS Counter Terminal</div>
                  <div className="text-[10px] text-slate-500">Dine-In & Counter bills</div>
                </div>
              </div>
              <span className="text-sm font-black text-purple-400 font-mono">₹{posTotal}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
