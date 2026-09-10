import { useState } from 'react';

export default function PosCheckoutModal({ 
  totals, 
  onClose, 
  onCompleteOrder,
  orderType,
  tableNumber 
}) {
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH', 'UPI', 'CARD'
  const [cashReceived, setCashReceived] = useState('');
  const [cardTxnId, setCardTxnId] = useState('');

  const finalTotal = totals.finalTotal;

  // Calculate change for cash
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeToReturn = Math.max(0, numCashReceived - finalTotal);
  const isCashInsufficient = paymentMode === 'CASH' && numCashReceived > 0 && numCashReceived < finalTotal;

  // Quick cash preset buttons
  const quickCashPresets = [
    finalTotal,
    Math.ceil(finalTotal / 50) * 50,
    Math.ceil(finalTotal / 100) * 100,
    Math.ceil(finalTotal / 500) * 500,
    1000
  ].filter((v, idx, self) => v >= finalTotal && self.indexOf(v) === idx).slice(0, 4);

  // Generate UPI QR String (UPI intent link format)
  const upiId = 'bunmaskacafe@upi';
  const upiName = 'Bun Maska Cafe';
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${finalTotal}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiString)}`;

  const handleFinish = () => {
    onCompleteOrder({
      paymentMethod: paymentMode,
      paymentStatus: paymentMode === 'CASH' ? 'PAID_CASH' : 'PAID_ONLINE',
      cashReceived: paymentMode === 'CASH' ? numCashReceived : finalTotal,
      changeReturned: paymentMode === 'CASH' ? changeToReturn : 0,
      cardTxnId: paymentMode === 'CARD' ? cardTxnId : null
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              {orderType} {tableNumber ? `(Table ${tableNumber})` : ''}
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">Complete POS Payment</h3>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400 block">Total Due</span>
            <span className="text-2xl font-black text-amber-400">₹{finalTotal}</span>
          </div>
        </div>

        {/* Payment Mode Selector Pills */}
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CASH', label: '💵 Cash', desc: 'Cash Drawer' },
              { id: 'UPI', label: '📲 UPI QR', desc: 'GPay/PhonePe' },
              { id: 'CARD', label: '💳 Card/POS', desc: 'Card Terminal' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setPaymentMode(mode.id)}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  paymentMode === mode.id
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-sm font-bold">{mode.label}</div>
                <div className="text-[10px] text-slate-500 font-normal">{mode.desc}</div>
              </button>
            ))}
          </div>

          {/* CASH MODE VIEW */}
          {paymentMode === 'CASH' && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Cash Received from Customer (₹)
                </label>
                <input
                  type="number"
                  placeholder={`Exact ₹${finalTotal}`}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xl font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                  autoFocus
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 self-center">Quick Cash:</span>
                {quickCashPresets.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashReceived(String(amount))}
                    className="px-3 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold font-mono transition-all"
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>

              {/* Change Return Summary */}
              {numCashReceived > 0 && (
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isCashInsufficient
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <span className="text-xs font-bold">
                    {isCashInsufficient ? '⚠️ Still Short By:' : '💰 Return Change to Customer:'}
                  </span>
                  <span className="text-xl font-black font-mono">
                    ₹{isCashInsufficient ? (finalTotal - numCashReceived) : changeToReturn}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* UPI QR MODE VIEW */}
          {paymentMode === 'UPI' && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
              <div className="text-xs font-bold text-slate-300">
                Scan & Pay with GPay / PhonePe / Paytm
              </div>

              {/* QR Image */}
              <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl shadow-lg flex items-center justify-center">
                <img 
                  src={qrCodeUrl} 
                  alt="UPI QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-xs font-mono text-amber-400 font-bold">
                UPI ID: {upiId}
              </div>
              <p className="text-[11px] text-slate-500">
                Verify customer screen notification before completing bill
              </p>
            </div>
          )}

          {/* CARD MODE VIEW */}
          {paymentMode === 'CARD' && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300">
                Swipe/Tap Card on POS Machine
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  POS Terminal Transaction / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-88204"
                  value={cardTxnId}
                  onChange={(e) => setCardTxnId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            Back to Cart
          </button>

          <button
            disabled={isCashInsufficient}
            onClick={handleFinish}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Complete & Print Bill 🖨️
          </button>
        </div>

      </div>
    </div>
  );
}
