import { useState } from 'react';

export default function PaymentsLogView({ orders, onSelectOrder }) {
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Compute revenue metrics
  const orderAmount = (order) => Number(order.amount ?? order.totalAmount ?? order.total ?? 0) || 0;
  const totalRevenue = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  
  const razorpayOrders = orders.filter(o => 
    (o.paymentMethod || o.payment_method || '').toUpperCase() === 'RAZORPAY' ||
    o.paymentStatus === 'SUCCESS' || o.payment_status === 'SUCCESS'
  );
  const razorpayTotal = razorpayOrders.reduce((sum, order) => sum + orderAmount(order), 0);

  const codOrders = orders.filter(o => 
    (o.paymentMethod || o.payment_method || 'COD').toUpperCase() === 'COD' &&
    o.paymentStatus !== 'SUCCESS' && o.payment_status !== 'SUCCESS'
  );
  const codTotal = codOrders.reduce((sum, order) => sum + orderAmount(order), 0);

  const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  // Filter list
  const filteredOrders = orders.filter(o => {
    const method = (o.paymentMethod || o.payment_method || 'COD').toUpperCase();
    if (methodFilter === 'RAZORPAY') return method === 'RAZORPAY';
    if (methodFilter === 'COD') return method === 'COD';
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Payments & Revenue Ledger</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Detailed financial audit log for online Razorpay payments and Cash on Delivery orders.
        </p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Total Revenue</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all {orders.length} orders</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
        </div>

        {/* Razorpay Online */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Razorpay Online</span>
            <span className="text-lg">💳</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight mt-2">
            ₹{razorpayTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{razorpayOrders.length} transactions completed</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
        </div>

        {/* Cash on Delivery */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Cash on Delivery</span>
            <span className="text-lg">💵</span>
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight mt-2">
            ₹{codTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{codOrders.length} COD orders</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
        </div>

        {/* Average Order Value */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Avg. Order Value</span>
            <span className="text-lg">📈</span>
          </div>
          <div className="text-2xl font-black text-purple-400 tracking-tight mt-2">
            ₹{avgOrderValue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Per customer check-out</p>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-purple-500/10 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMethodFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              methodFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            All Payment Methods ({orders.length})
          </button>
          <button
            onClick={() => setMethodFilter('RAZORPAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              methodFilter === 'RAZORPAY'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            💳 Razorpay ({razorpayOrders.length})
          </button>
          <button
            onClick={() => setMethodFilter('COD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              methodFilter === 'COD'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            💵 Cash on Delivery ({codOrders.length})
          </button>
        </div>
      </div>

      {/* Payment Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                <th className="py-3.5 px-4 font-semibold">Order ID</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                <th className="py-3.5 px-4 font-semibold">Transaction / Payment ID</th>
                <th className="py-3.5 px-4 font-semibold">Amount (₹)</th>
                <th className="py-3.5 px-4 font-semibold">Payment Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredOrders.map((order) => {
                const method = (order.paymentMethod || order.payment_method || 'COD').toUpperCase();
                const isPaid = order.paymentStatus === 'SUCCESS' || order.payment_status === 'SUCCESS' || method === 'RAZORPAY';
                const paymentId = order.razorpayPaymentId || order.razorpay_payment_id || order.paymentId || (method === 'COD' ? `COD_${order.id || order.orderId}` : 'pay_simulated_9921');

                return (
                  <tr key={order.id || order.orderId} className="hover:bg-slate-800/40 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                      {formatDate(order.createdAt || order.orderDate)}
                    </td>

                    {/* Order ID */}
                    <td className="py-3.5 px-4 font-bold text-amber-400 font-mono text-xs">
                      #{order.id || order.orderId}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-200">
                      {order.customerName || order.customer_name || 'Guest'}
                    </td>

                    {/* Method */}
                    <td className="py-3.5 px-4 text-xs">
                      {method === 'RAZORPAY' ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          💳 Razorpay UPI/Card
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          💵 Cash on Delivery
                        </span>
                      )}
                    </td>

                    {/* Transaction ID */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {paymentId}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-black text-white text-sm">
                      ₹{order.totalAmount || order.total || 0}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4 text-xs">
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          SUCCESS / PAID
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          PENDING AT DELIVERY
                        </span>
                      )}
                    </td>

                    {/* View Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectOrder(order)}
                        className="text-xs text-amber-400 hover:underline font-bold"
                      >
                        Inspect ➔
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
  );
}
