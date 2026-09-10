import { getStoreSettings } from '../../services/storeSettingsService'

export default function ThermalReceiptModal({ order, onClose }) {
  const storeSettings = getStoreSettings()

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return new Date().toLocaleString();
    }
  };

  const items = Array.isArray(order?.items) ? order.items : [];
  const paymentDetails = order?.paymentDetails || {};

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Controls */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 no-print">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🖨️ POS Thermal Receipt</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
              PAID
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕ Close
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-white text-black font-mono text-xs leading-tight select-text print:p-0 print:m-0" id="thermal-receipt">
          
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
            <div className="text-lg font-black tracking-tight uppercase">{storeSettings.storeName || 'BUN MASKA CAFÉ'}</div>
            <div>Fresh Taste & Artisanal Teas</div>
            <div className="text-[10px]">{storeSettings.address}, {storeSettings.city}</div>
            <div className="text-[10px]">Ph: {storeSettings.phone} | {storeSettings.email}</div>
          </div>

          {/* Bill Info */}
          <div className="py-2.5 space-y-1 border-b border-dashed border-black">
            <div className="flex justify-between font-bold">
              <span>Order #: {order?.id || order?.orderId}</span>
              <span>{order?.orderType || 'COUNTER'}</span>
            </div>
            {order?.tableNumber && (
              <div className="font-bold text-sm">TABLE #: {order.tableNumber}</div>
            )}
            <div>Date: {formatDate(order?.createdAt)}</div>
            <div>Customer: {order?.customerName || order?.customer?.name || 'Guest'}</div>
            <div>Payment: {order?.paymentMethod || 'CASH'}</div>
          </div>

          {/* Items Header */}
          <div className="py-2 border-b border-black font-bold flex justify-between uppercase">
            <span className="w-1/2">Item Description</span>
            <span className="w-1/4 text-center">Qty</span>
            <span className="w-1/4 text-right">Amt (₹)</span>
          </div>

          {/* Items List */}
          <div className="py-2 space-y-1 border-b border-dashed border-black">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="w-1/2 truncate">{item.name || item.title}</span>
                <span className="w-1/4 text-center">{item.quantity}</span>
                <span className="w-1/4 text-right">{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Financial Totals */}
          <div className="py-2 space-y-1 border-b border-black">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{(order?.subtotal || order?.amount || 0).toFixed(2)}</span>
            </div>

            {order?.discountVal > 0 && (
              <div className="flex justify-between text-black">
                <span>Discount:</span>
                <span>-₹{order.discountVal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>CGST (2.5%):</span>
              <span>₹{((order?.gstTax || 0) / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST (2.5%):</span>
              <span>₹{((order?.gstTax || 0) / 2).toFixed(2)}</span>
            </div>

            <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-black">
              <span>NET TOTAL:</span>
              <span>₹{(order?.finalTotal || order?.totalAmount || order?.amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Cash Change details if cash */}
          {paymentDetails.cashReceived > 0 && (
            <div className="py-2 space-y-1 border-b border-dashed border-black text-[11px]">
              <div className="flex justify-between">
                <span>Cash Received:</span>
                <span>₹{paymentDetails.cashReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change Returned:</span>
                <span>₹{paymentDetails.changeReturned.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Footer Thank You */}
          <div className="text-center pt-3 space-y-1">
            <div className="font-bold uppercase">*** Thank You! Visit Again ***</div>
            <div className="text-[10px]">Follow us @bunmaskacafe</div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
          >
            New Order
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
          >
            <span>🖨️ Print Thermal Bill</span>
          </button>
        </div>

      </div>
    </div>
  );
}
