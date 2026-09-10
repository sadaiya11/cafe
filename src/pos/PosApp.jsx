import { useState, useEffect } from 'react';
import PosHeader from './components/PosHeader';
import PosMenuGrid from './components/PosMenuGrid';
import PosCartPanel from './components/PosCartPanel';
import PosCheckoutModal from './components/PosCheckoutModal';
import ThermalReceiptModal from './components/ThermalReceiptModal';
import ShiftSummaryModal from './components/ShiftSummaryModal';
import { getLocalCatalog, loadCatalog } from '../services/productCatalog';
import { createOrder } from '../services/api';

export default function PosApp() {
  const [products, setProducts] = useState(getLocalCatalog);
  const [cartItems, setCartItems] = useState([]);
  const [orderType, setOrderType] = useState('DINE_IN');
  const [tableNumber, setTableNumber] = useState('01');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');

  // Mobile tab state: 'menu' or 'ticket'
  const [mobileTab, setMobileTab] = useState('menu');

  const [checkoutTotals, setCheckoutTotals] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShiftSummaryModal, setShowShiftSummaryModal] = useState(false);

  // Shift summary tracking
  const [shiftOrders, setShiftOrders] = useState([]);
  const [shiftStartTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Load products dynamically from admin product catalog
  const syncProducts = () => {
    loadCatalog().then(catalog => {
      if (Array.isArray(catalog) && catalog.length > 0) {
        setProducts(catalog);
      }
    });
  };

  useEffect(() => {
    syncProducts();
    window.addEventListener('focus', syncProducts);
    return () => window.removeEventListener('focus', syncProducts);
  }, []);

  // Add product to cart ticket
  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Update item quantity
  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
  };

  // Remove item
  const handleRemoveItem = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  // Clear ticket
  const handleClearCart = () => {
    setCartItems([]);
    setDiscountAmount('0');
  };

  // Open Checkout Modal
  const handleProceedToCheckout = (totals) => {
    setCheckoutTotals(totals);
    setShowCheckoutModal(true);
  };

  // Complete Order & Save to Supabase API
  const handleCompleteOrder = async (paymentDetails) => {
    const orderId = `POS-${Date.now().toString().slice(-6)}`;
    const finalOrder = {
      id: orderId,
      orderId,
      orderType,
      tableNumber: orderType === 'DINE_IN' ? (tableNumber || '01') : null,
      customerName: customerName || 'Counter Guest',
      phone: customerPhone || '',
      items: cartItems,
      subtotal: checkoutTotals.subtotal,
      discountVal: checkoutTotals.discountVal,
      gstTax: checkoutTotals.gstTax,
      finalTotal: checkoutTotals.finalTotal,
      amount: checkoutTotals.finalTotal,
      paymentMethod: paymentDetails.paymentMethod,
      paymentStatus: paymentDetails.paymentStatus,
      paymentDetails,
      createdAt: new Date().toISOString(),
      status: 'CONFIRMED'
    };

    // Save order to Express backend & Supabase DB
    try {
      await createOrder({
        orderId,
        customer: {
          name: finalOrder.customerName,
          phone: finalOrder.phone,
          orderType,
          tableNumber: finalOrder.tableNumber
        },
        amount: checkoutTotals.finalTotal,
        currency: 'INR',
        items: cartItems,
        paymentId: paymentDetails.cardTxnId || `${paymentDetails.paymentMethod}_${orderId}`,
        paymentMethod: paymentDetails.paymentMethod,
        paymentStatus: paymentDetails.paymentStatus,
        status: 'CONFIRMED'
      });
    } catch (e) {
      console.warn('POS order save fallback notice:', e.message);
    }

    // Add to local shift orders
    setShiftOrders(prev => [finalOrder, ...prev]);

    // Close checkout modal & show printable receipt
    setShowCheckoutModal(false);
    setCompletedOrder(finalOrder);
    setShowReceiptModal(true);

    // Reset current ticket for next customer
    setCartItems([]);
    setDiscountAmount('0');
    setCustomerName('');
    setCustomerPhone('');
    setMobileTab('menu');
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="h-screen bg-[#090d16] text-slate-100 font-sans flex flex-col overflow-hidden select-none">
      
      {/* Header */}
      <PosHeader 
        cartCount={totalCartCount}
        onOpenShiftSummary={() => setShowShiftSummaryModal(true)}
        onResetCart={handleClearCart}
      />

      {/* Mobile Tab View Selector (< lg) */}
      <div className="flex lg:hidden bg-slate-950 border-b border-slate-800 p-1 shrink-0">
        <button
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            mobileTab === 'menu'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🍔</span>
          <span>Food Menu</span>
        </button>

        <button
          onClick={() => setMobileTab('ticket')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 relative ${
            mobileTab === 'ticket'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎟️</span>
          <span>Ticket</span>
          {totalCartCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              mobileTab === 'ticket' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
            }`}>
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Menu Grid (Show always on Desktop, or when mobileTab === 'menu' on Mobile) */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'}`}>
          <PosMenuGrid 
            products={products}
            onAddToCart={handleAddToCart}
          />

          {/* Floating Mobile Cart Bar (When on Menu tab and items exist) */}
          {totalCartCount > 0 && (
            <div className="lg:hidden p-3 bg-slate-950/90 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setMobileTab('ticket')}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-between px-4 shadow-lg active:scale-95"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 text-[10px] flex items-center justify-center font-bold">
                    {totalCartCount}
                  </span>
                  <span>View Current Ticket</span>
                </div>
                <div className="flex items-center space-x-1 font-mono font-extrabold text-sm">
                  <span>₹{totalSubtotal}</span>
                  <span>➔</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Active Ticket Cart Panel (Show always on Desktop, or when mobileTab === 'ticket' on Mobile) */}
        <div className={`w-full lg:w-[380px] xl:w-[420px] flex flex-col overflow-hidden ${mobileTab === 'ticket' ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Mobile Back Button */}
          <div className="lg:hidden px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileTab('menu')}
              className="text-xs font-bold text-amber-400 flex items-center space-x-1"
            >
              <span>← Back to Menu</span>
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              Total: <strong className="text-white">₹{totalSubtotal}</strong>
            </span>
          </div>

          <PosCartPanel 
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            orderType={orderType}
            setOrderType={setOrderType}
            tableNumber={tableNumber}
            setTableNumber={setTableNumber}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            discountAmount={discountAmount}
            setDiscountAmount={setDiscountAmount}
            onProceedToCheckout={handleProceedToCheckout}
          />
        </div>

      </div>

      {/* Checkout Payment Modal */}
      {showCheckoutModal && (
        <PosCheckoutModal 
          totals={checkoutTotals}
          onClose={() => setShowCheckoutModal(false)}
          onCompleteOrder={handleCompleteOrder}
          orderType={orderType}
          tableNumber={tableNumber}
        />
      )}

      {/* Printable Thermal Receipt Modal */}
      {showReceiptModal && (
        <ThermalReceiptModal 
          order={completedOrder}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* Cashier Shift Z-Report Summary Modal */}
      {showShiftSummaryModal && (
        <ShiftSummaryModal 
          shiftOrders={shiftOrders}
          shiftStartTime={shiftStartTime}
          onClose={() => setShowShiftSummaryModal(false)}
        />
      )}

    </div>
  );
}
