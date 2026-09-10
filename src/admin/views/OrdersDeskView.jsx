import { useState } from 'react';

export default function OrdersDeskView({ 
  orders, 
  onUpdateStatus, 
  onSelectOrder, 
  searchTerm 
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const statusOptions = [
    { id: 'ALL', label: 'All Orders', count: orders.length, color: 'bg-slate-800 text-slate-300' },
    { id: 'PENDING', label: 'Pending', count: orders.filter(o => o.status === 'PENDING' || !o.status).length, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { id: 'PREPARING', label: 'Preparing', count: orders.filter(o => o.status === 'PREPARING').length, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', count: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { id: 'DELIVERED', label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { id: 'CANCELLED', label: 'Cancelled', count: orders.filter(o => o.status === 'CANCELLED').length, color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
  ];

  // Filter orders by status tab and global search term
  const filteredOrders = orders.filter(order => {
    // Status match
    const currentStatus = order.status || 'PENDING';
    if (statusFilter !== 'ALL' && currentStatus !== statusFilter) {
      return false;
    }

    // Search match
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const orderIdStr = String(order.id || order.orderId || '').toLowerCase();
      const customer = order.customer || {};
      const custName = String(order.customerName || order.customer_name || customer.name || '').toLowerCase();
      const phone = String(order.phone || customer.phone || '').toLowerCase();
      const address = String(order.address || customer.address || '').toLowerCase();
      const city = String(order.city || customer.city || '').toLowerCase();

      return (
        orderIdStr.includes(term) ||
        custName.includes(term) ||
        phone.includes(term) ||
        address.includes(term) ||
        city.includes(term)
      );
    }

    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PREPARING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Preparing
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Out for Delivery
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Cancelled
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 w-fit animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            New / Pending
          </span>
        );
    }
  };

  const getPaymentBadge = (order) => {
    const isPaid = order.paymentStatus === 'SUCCESS' || order.payment_status === 'SUCCESS' || Boolean(order.paymentId) || order.status === 'PAID';
    const method = (order.paymentMethod || order.payment_method || 'COD').toUpperCase();

    if (method === 'RAZORPAY' || isPaid) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          💳 Razorpay Paid
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
        💵 Cash on Delivery
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Order Processing Desk</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time incoming orders, update kitchen & delivery status, and view customer locations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {statusOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border ${
                statusFilter === opt.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-base font-bold text-slate-300">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {searchTerm 
              ? `No orders matching "${searchTerm}". Try clearing your search.` 
              : `There are currently no orders under "${statusFilter}" status.`}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 font-semibold">Order ID & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Items</th>
                  <th className="py-3.5 px-4 font-semibold">Amount & Payment</th>
                  <th className="py-3.5 px-4 font-semibold">Order Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredOrders.map((order) => {
                  const itemsList = Array.isArray(order.items) ? order.items : Array.isArray(order.order_items) ? order.order_items : [];
                  const customer = order.customer || {};
                  const orderAmount = Number(order.amount ?? order.totalAmount ?? order.total ?? 0);
                  const currentStatus = order.status || 'PENDING';

                  return (
                    <tr 
                      key={order.id || order.orderId}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Order ID & Time */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-amber-400 font-mono text-sm">
                          #{order.id || order.orderId}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          ⏱️ {formatDate(order.createdAt || order.orderDate)}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-white">
                          {order.customerName || order.customer_name || customer.name || 'Guest Customer'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          📞 {order.phone || customer.phone || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-[200px]" title={order.address || customer.address}>
                          📍 {order.address || customer.address || 'Address on file'}
                        </div>
                      </td>

                      {/* Items Summary */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          {itemsList.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-xs flex items-center space-x-1.5">
                              <span className="font-bold text-amber-400">{item.quantity || 1}x</span>
                              <span className="max-w-[260px] whitespace-normal break-words text-slate-200">{item.name || item.title || 'Item'}</span>
                            </div>
                          ))}
                          {itemsList.length > 2 && (
                            <div className="text-[11px] text-amber-500 font-medium pt-0.5">
                              +{itemsList.length - 2} more item(s)
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Amount & Payment */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-black text-white text-base">
                          ₹{orderAmount.toFixed(2)}
                        </div>
                        <div className="mt-1">
                          {getPaymentBadge(order)}
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="py-4 px-4 align-top">
                        <div>
                          {getStatusBadge(currentStatus)}
                        </div>
                        
                        {/* Quick Change Dropdown */}
                        <div className="mt-2">
                          <select
                            value={currentStatus}
                            onChange={(e) => onUpdateStatus(order, e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 py-1 px-2 focus:outline-none focus:border-amber-500"
                          >
                            <option value="PENDING">Set: PENDING</option>
                            <option value="PREPARING">Set: PREPARING</option>
                            <option value="OUT_FOR_DELIVERY">Set: OUT FOR DELIVERY</option>
                            <option value="DELIVERED">Set: DELIVERED</option>
                            <option value="CANCELLED">Set: CANCELLED</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-top text-right">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 shadow-sm"
                        >
                          Details ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
