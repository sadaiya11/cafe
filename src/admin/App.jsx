import { useState, useEffect, useRef, useCallback } from 'react';
import AdminHeader from './components/AdminHeader';
import AdminSidebar from './components/AdminSidebar';
import OrdersDeskView from './views/OrdersDeskView';
import ProductsCatalogView from './views/ProductsCatalogView';
import PaymentsLogView from './views/PaymentsLogView';
import AnalyticsDashboardView from './views/AnalyticsDashboardView';
import CouponsManagerView from './views/CouponsManagerView';
import InventoryManagerView from './views/InventoryManagerView';
import StoreSettingsView from './views/StoreSettingsView';
import ReviewsManagerView from './views/ReviewsManagerView';
import CustomersManagerView from './views/CustomersManagerView';
import OrderDetailModal from './components/OrderDetailModal';
import OrderNotificationToast from './components/OrderNotificationToast';
import { fetchAdminOrders, updateOrderStatus } from './services/adminApi';
import { playNewOrderChime } from './services/soundAlert';
import { getLocalCatalog } from '../services/productCatalog';

export default function App() {
  const staffSession = (() => {
    try {
      return JSON.parse(localStorage.getItem('bun_maska_staff_session') || 'null')
    } catch {
      return null
    }
  })()
  const isStaff = staffSession?.role === 'STAFF'
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('bun_admin_sound') !== 'false';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newOrderToast, setNewOrderToast] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [productsCount, setProductsCount] = useState(() => getLocalCatalog().length);
  const handleProductsChange = useCallback((products) => setProductsCount(products.length), []);

  const prevOrdersCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  // Load orders function
  const loadOrders = useCallback(async () => {
    setIsRefreshing(true);
    const data = await fetchAdminOrders();
    setOrders(data);
    setIsRefreshing(false);

    // Detect new incoming orders after initial render
    if (!isFirstLoadRef.current && data.length > prevOrdersCountRef.current) {
      const newestOrder = data[0]; // Most recent order
      if (soundEnabled) {
        playNewOrderChime();
      }
      setNewOrderToast(newestOrder);
    }

    prevOrdersCountRef.current = data.length;
    isFirstLoadRef.current = false;
  }, [soundEnabled]);

  // Initial load and 1-minute polling interval
  useEffect(() => {
    let isMounted = true;
    fetchAdminOrders().then((data) => {
      if (!isMounted) return;
      setOrders(data);
      prevOrdersCountRef.current = data.length;
      isFirstLoadRef.current = false;
    });

    const interval = setInterval(() => {
      loadOrders();
    }, 60000); // Poll every 1 minute for live customer orders

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadOrders]);

  // Save sound setting
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('bun_admin_sound', nextState ? 'true' : 'false');
  };

  const handleTestSound = () => {
    playNewOrderChime();
  };

  // Status Change Handler
  const handleUpdateStatus = async (orderOrId, newStatus) => {
    let primaryId = orderOrId;
    let altId = null;

    if (typeof orderOrId === 'object' && orderOrId !== null) {
      primaryId = orderOrId.orderId || orderOrId.id;
      altId = orderOrId.id || orderOrId.orderId;
    }

    const success = await updateOrderStatus(primaryId, newStatus, altId);
    if (success) {
      const isMatch = (o) =>
        (primaryId && (o.id === primaryId || o.orderId === primaryId || String(o.id) === String(primaryId) || String(o.orderId) === String(primaryId))) ||
        (altId && (o.id === altId || o.orderId === altId || String(o.id) === String(altId) || String(o.orderId) === String(altId)));

      setOrders(prev => prev.map(o => isMatch(o) ? { ...o, status: newStatus } : o));
      if (selectedOrder && isMatch(selectedOrder)) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    }
  };

  // Calculate stats
  const activeOrdersCount = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'OUT_FOR_DELIVERY').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount || o.total || o.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      
      {/* Real-time Order Notification Toast */}
      <OrderNotificationToast 
        order={newOrderToast} 
        onClose={() => setNewOrderToast(null)} 
        onViewOrder={(order) => {
          setSelectedOrder(order);
          setActiveTab('orders');
        }}
      />

      {/* Header */}
      <AdminHeader 
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onTestSound={handleTestSound}
        onRefresh={loadOrders}
        isRefreshing={isRefreshing}
        activeOrdersCount={activeOrdersCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <AdminSidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ordersCount={orders.length}
          productsCount={productsCount}
          totalRevenue={totalRevenue}
            isStaff={isStaff}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
          {activeTab === 'orders' && (
            <OrdersDeskView 
              orders={orders}
              onUpdateStatus={handleUpdateStatus}
              onSelectOrder={setSelectedOrder}
              searchTerm={searchTerm}
            />
          )}

          {!isStaff && activeTab === 'products' && (
            <ProductsCatalogView onProductsChange={handleProductsChange} />
          )}

          {!isStaff && activeTab === 'payments' && (
            <PaymentsLogView 
              orders={orders}
              onSelectOrder={setSelectedOrder}
            />
          )}

          {!isStaff && activeTab === 'analytics' && (
            <AnalyticsDashboardView orders={orders} />
          )}

          {!isStaff && activeTab === 'coupons' && (
            <CouponsManagerView />
          )}

          {!isStaff && activeTab === 'inventory' && (
            <InventoryManagerView />
          )}

          {!isStaff && activeTab === 'settings' && (
            <StoreSettingsView />
          )}

          {!isStaff && activeTab === 'customers' && (
            <CustomersManagerView orders={orders} />
          )}

          {!isStaff && activeTab === 'reviews' && (
            <ReviewsManagerView />
          )}
        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

    </div>
  );
}
