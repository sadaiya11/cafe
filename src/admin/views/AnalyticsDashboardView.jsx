import { useState, useMemo } from 'react';
import {
  exportOrdersToCSV,
  exportDailyReportToCSV,
  exportProfitabilityToCSV,
  exportRepeatCustomersToCSV,
} from '../services/csvExportService';

export default function AnalyticsDashboardView({ orders = [] }) {
  // Date Range State
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'today', 'yesterday', '7days', '30days', 'thisMonth'
  const [activeReportTab, setActiveReportTab] = useState('overview'); // 'overview', 'daily', 'financials', 'products', 'customers', 'peak_payment'
  const [productSortBy, setProductSortBy] = useState('profit'); // 'profit', 'qty', 'revenue', 'margin'

  // Date Filter Logic
  const filteredOrders = useMemo(() => {
    if (!orders || !orders.length) return [];
    const now = new Date();

    return orders.filter(o => {
      const orderDate = new Date(o.createdAt || o.date || o.timestamp || Date.now());
      if (isNaN(orderDate.getTime())) return true;

      if (timeRange === 'today') {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeRange === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return (
          orderDate.getDate() === yesterday.getDate() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getFullYear() === yesterday.getFullYear()
        );
      }
      if (timeRange === '7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      }
      if (timeRange === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return orderDate >= thirtyDaysAgo;
      }
      if (timeRange === 'thisMonth') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true; // 'all'
    });
  }, [orders, timeRange]);

  // 1. Core Financial Metrics Calculations
  const metrics = useMemo(() => {
    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalDelivery = 0;
    let totalNetRevenue = 0;

    filteredOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : Array.isArray(o.order_items) ? o.order_items : [];
      let rawItemsSubtotal = 0;

      items.forEach(item => {
        const price = parseFloat(item.price || item.unitPrice) || 0;
        const qty = parseInt(item.quantity || item.qty) || 1;
        rawItemsSubtotal += price * qty;
      });

      const orderTotal = parseFloat(o.totalAmount || o.finalPayableTotal || o.total || o.amount) || 0;
      const orderSubtotal = parseFloat(o.subtotal || o.rawSubtotal) || (rawItemsSubtotal > 0 ? rawItemsSubtotal : orderTotal);
      const discount = parseFloat(o.couponDiscount || o.discountVal || o.discount) || 0;
      const tax = parseFloat(o.taxAmount || o.gstTax || o.tax) || 0;
      const delivery = parseFloat(o.deliveryFee || o.delivery) || 0;

      totalGrossSales += orderSubtotal;
      totalDiscounts += discount;
      totalTax += tax;
      totalDelivery += delivery;
      totalNetRevenue += orderTotal || Math.max(0, orderSubtotal - discount + tax + delivery);
    });

    const netSales = Math.max(0, totalGrossSales - totalDiscounts);
    const totalOrdersCount = filteredOrders.length;
    const aov = totalOrdersCount > 0 ? Math.round(totalNetRevenue / totalOrdersCount) : 0;

    return {
      totalGrossSales,
      totalDiscounts,
      netSales,
      totalTax,
      totalDelivery,
      totalNetRevenue,
      totalOrdersCount,
      aov,
    };
  }, [filteredOrders]);

  // 2. Daily Sales Breakdown
  const dailySales = useMemo(() => {
    const map = {};

    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt || o.date || o.timestamp || Date.now());
      const dateKey = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : 'Unknown Date';
      const dateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Unknown Date';

      if (!map[dateKey]) {
        map[dateKey] = {
          dateKey,
          dateStr,
          orderCount: 0,
          grossSales: 0,
          discounts: 0,
          netSales: 0,
          tax: 0,
          delivery: 0,
          totalRevenue: 0,
        };
      }

      const items = Array.isArray(o.items) ? o.items : [];
      let itemsSubtotal = 0;
      items.forEach(i => {
        itemsSubtotal += (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1);
      });

      const orderTotal = parseFloat(o.totalAmount || o.finalPayableTotal || o.total || o.amount) || 0;
      const gross = parseFloat(o.subtotal || o.rawSubtotal) || (itemsSubtotal > 0 ? itemsSubtotal : orderTotal);
      const discount = parseFloat(o.couponDiscount || o.discountVal || o.discount) || 0;
      const tax = parseFloat(o.taxAmount || o.gstTax || o.tax) || 0;
      const delivery = parseFloat(o.deliveryFee || o.delivery) || 0;

      map[dateKey].orderCount += 1;
      map[dateKey].grossSales += gross;
      map[dateKey].discounts += discount;
      map[dateKey].tax += tax;
      map[dateKey].delivery += delivery;
      map[dateKey].totalRevenue += orderTotal || Math.max(0, gross - discount + tax + delivery);
    });

    return Object.values(map)
      .map(row => ({
        ...row,
        netSales: Math.max(0, row.grossSales - row.discounts),
        aov: row.orderCount > 0 ? Math.round(row.totalRevenue / row.orderCount) : 0,
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredOrders]);

  // 3. Best-Selling Products & Product Profitability
  const productAnalytics = useMemo(() => {
    const map = {};

    filteredOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : Array.isArray(o.order_items) ? o.order_items : [];

      items.forEach(item => {
        const slug = item.slug || item.id || item.productId || 'unknown';
        const title = item.title || item.name || 'Bun Maska Specia';
        const qty = parseInt(item.quantity || item.qty) || 1;
        const unitPrice = parseFloat(item.price || item.unitPrice) || 0;
        // F&B standard baseline: 40% cost price if explicit costPrice not defined
        const unitCost = item.costPrice ? parseFloat(item.costPrice) : Math.round(unitPrice * 0.40);

        if (!map[slug]) {
          map[slug] = {
            slug,
            title,
            category: item.category || 'Food Item',
            qty: 0,
            unitPrice,
            unitCost,
            totalRevenue: 0,
            totalCost: 0,
            orderCount: 0,
          };
        }

        map[slug].qty += qty;
        map[slug].totalRevenue += unitPrice * qty;
        map[slug].totalCost += unitCost * qty;
        map[slug].orderCount += 1;
      });
    });

    const list = Object.values(map).map(p => {
      const grossProfit = p.totalRevenue - p.totalCost;
      const marginPct = p.totalRevenue > 0 ? (grossProfit / p.totalRevenue) * 100 : 0;
      return {
        ...p,
        grossProfit,
        marginPct,
      };
    });

    // Dynamic Sorting
    if (productSortBy === 'qty') list.sort((a, b) => b.qty - a.qty);
    else if (productSortBy === 'revenue') list.sort((a, b) => b.totalRevenue - a.totalRevenue);
    else if (productSortBy === 'margin') list.sort((a, b) => b.marginPct - a.marginPct);
    else list.sort((a, b) => b.grossProfit - a.grossProfit); // 'profit'

    return list;
  }, [filteredOrders, productSortBy]);

  // 4. Repeat Customers & Retention Analysis
  const customerAnalytics = useMemo(() => {
    const map = {};

    filteredOrders.forEach(o => {
      const customer = o.customer || {};
      const phone = o.customerPhone || customer.phone || customer.mobile || '';
      const email = o.customerEmail || customer.email || '';
      const name = o.customerName || customer.name || customer.fullName || 'Guest Customer';
      const key = phone || email || name;

      if (!map[key]) {
        map[key] = {
          key,
          name,
          contact: phone || email || 'N/A',
          orderCount: 0,
          totalSpent: 0,
        };
      }

      const total = parseFloat(o.totalAmount || o.finalPayableTotal || o.total || o.amount) || 0;
      map[key].orderCount += 1;
      map[key].totalSpent += total;
    });

    const customers = Object.values(map).map(c => ({
      ...c,
      aov: c.orderCount > 0 ? Math.round(c.totalSpent / c.orderCount) : 0,
      isRepeat: c.orderCount > 1,
    }));

    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter(c => c.isRepeat);
    const repeatCount = repeatCustomers.length;
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCount / totalCustomers) * 100) : 0;

    const topLoyalCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

    return {
      totalCustomers,
      repeatCount,
      singleOrderCount: totalCustomers - repeatCount,
      repeatRate,
      topLoyalCustomers,
      allCustomers: customers,
    };
  }, [filteredOrders]);

  // 5. Peak Ordering Times (Hourly Distribution)
  const hourlyAnalytics = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM`,
      orderCount: 0,
      revenue: 0,
    }));

    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt || o.date || o.timestamp || Date.now());
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        const total = parseFloat(o.totalAmount || o.finalPayableTotal || o.total || o.amount) || 0;
        hours[h].orderCount += 1;
        hours[h].revenue += total;
      }
    });

    const maxOrders = Math.max(...hours.map(h => h.orderCount), 1);
    const peakHours = [...hours].sort((a, b) => b.orderCount - a.orderCount).slice(0, 3);

    return {
      hours,
      maxOrders,
      peakHours,
    };
  }, [filteredOrders]);

  // 6. Payment Method & Channel Breakdown
  const paymentAnalytics = useMemo(() => {
    const channels = {
      RAZORPAY: { name: 'Razorpay Online (UPI/Card)', icon: '💳', count: 0, revenue: 0, color: 'text-emerald-400' },
      COD: { name: 'Cash on Delivery (COD)', icon: '💵', count: 0, revenue: 0, color: 'text-amber-400' },
      CASH: { name: 'POS Counter Cash', icon: '🛍️', count: 0, revenue: 0, color: 'text-purple-400' },
      UPI: { name: 'POS Counter UPI', icon: '📱', count: 0, revenue: 0, color: 'text-blue-400' },
      CARD: { name: 'POS Counter Card', icon: '💳', count: 0, revenue: 0, color: 'text-pink-400' },
    };

    filteredOrders.forEach(o => {
      const method = (o.paymentMethod || o.payment_method || 'COD').toUpperCase();
      const total = parseFloat(o.totalAmount || o.finalPayableTotal || o.total || o.amount) || 0;

      if (channels[method]) {
        channels[method].count += 1;
        channels[method].revenue += total;
      } else if (o.paymentStatus === 'PAID_ONLINE') {
        channels.RAZORPAY.count += 1;
        channels.RAZORPAY.revenue += total;
      } else {
        channels.COD.count += 1;
        channels.COD.revenue += total;
      }
    });

    const list = Object.values(channels).filter(c => c.count > 0 || c.revenue > 0);
    const totalChannelRevenue = list.reduce((sum, c) => sum + c.revenue, 0) || 1;

    return list.map(c => ({
      ...c,
      sharePct: Math.round((c.revenue / totalChannelRevenue) * 100),
    }));
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      
      {/* Header & Date Range Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h2 className="text-2xl font-black text-white tracking-tight">Business Reporting & Financial Analytics</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Comprehensive report suite covering daily sales, gross vs net revenue, tax, delivery fees, discounts, best sellers, repeat customers, and margins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Range Filter */}
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 text-xs font-semibold text-slate-300">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'thisMonth', label: 'This Month' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTimeRange(opt.id)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    timeRange === opt.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Global CSV Export */}
            <button
              onClick={() => exportOrdersToCSV(filteredOrders, `Bun_Maska_Report_${timeRange}`)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition shadow-md shadow-emerald-500/20 cursor-pointer"
              title="Export complete order sales ledger into CSV"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto text-xs font-bold">
          {[
            { id: 'overview', label: '📈 Executive Overview', count: null },
            { id: 'daily', label: '📅 Daily Sales Ledger', count: dailySales.length },
            { id: 'financials', label: '💰 Financial & Tax Ledger', count: null },
            { id: 'products', label: '🍔 Best Sellers & Profitability', count: productAnalytics.length },
            { id: 'customers', label: '👥 Repeat Customers & Retention', count: `${customerAnalytics.repeatRate}%` },
            { id: 'peak_payment', label: '⏰ Peak Hours & Payment Channels', count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                activeReportTab === tab.id
                  ? 'bg-slate-800 text-amber-400 font-extrabold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-400 font-mono border border-slate-800">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4.8 BUSINESS REPORTING 12-METRIC SUMMARY CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* 1. Daily / Total Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
          <div className="text-xl font-black text-amber-400 tracking-tight mt-1">
            {metrics.totalOrdersCount}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Total Completed</span>
        </div>

        {/* 2. Gross Sales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Sales</span>
          <div className="text-xl font-black text-white tracking-tight mt-1 font-mono">
            ₹{metrics.totalGrossSales.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Pre-discount sales</span>
        </div>

        {/* 3. Discounts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discounts Given</span>
          <div className="text-xl font-black text-rose-400 tracking-tight mt-1 font-mono">
            -₹{metrics.totalDiscounts.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Promo & Coupon savings</span>
        </div>

        {/* 4. Net Sales */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Sales</span>
          <div className="text-xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
            ₹{metrics.netSales.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Gross minus discounts</span>
        </div>

        {/* 5. Tax Collected */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST Tax Collected</span>
          <div className="text-xl font-black text-blue-400 tracking-tight mt-1 font-mono">
            ₹{metrics.totalTax.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Government tax</span>
        </div>

        {/* 6. Delivery Fees */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Fees</span>
          <div className="text-xl font-black text-purple-400 tracking-tight mt-1 font-mono">
            ₹{metrics.totalDelivery.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Shipping collected</span>
        </div>

      </div>

      {/* SECOND ROW OF EXECUTIVE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Net Billed Revenue</span>
            <div className="text-2xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
              ₹{metrics.totalNetRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Final customer payments</p>
          </div>
          <span className="text-3xl">💰</span>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg Order Value (AOV)</span>
            <div className="text-2xl font-black text-amber-400 tracking-tight mt-1 font-mono">
              ₹{metrics.aov}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Revenue per ticket</p>
          </div>
          <span className="text-3xl">📈</span>
        </div>

        {/* Repeat Customer Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Repeat Customer Rate</span>
            <div className="text-2xl font-black text-purple-400 tracking-tight mt-1 font-mono">
              {customerAnalytics.repeatRate}%
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">{customerAnalytics.repeatCount} repeat buyers</p>
          </div>
          <span className="text-3xl">🔁</span>
        </div>

        {/* Peak Ordering Hour */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Top Peak Hours</span>
            <div className="text-lg font-black text-blue-400 tracking-tight mt-1">
              {hourlyAnalytics.peakHours[0] ? hourlyAnalytics.peakHours[0].label : 'N/A'}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {hourlyAnalytics.peakHours[0] ? `${hourlyAnalytics.peakHours[0].orderCount} orders received` : 'No data'}
            </p>
          </div>
          <span className="text-3xl">⏰</span>
        </div>

      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {(activeReportTab === 'overview' || activeReportTab === 'financials') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Detailed Financial & Tax Statement */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋</span>
                <span>Financial & Tax Ledger Statement</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Breakdown</span>
            </div>

            <div className="space-y-3 divide-y divide-slate-800/60">
              
              <div className="pt-2 flex justify-between items-center text-sm">
                <span className="text-slate-300 font-medium">1. Gross Item Sales (Pre-Discount)</span>
                <span className="font-mono font-bold text-white">₹{metrics.totalGrossSales.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-3 flex justify-between items-center text-sm">
                <span className="text-rose-400 font-medium">2. Less: Promo Discounts & Coupons</span>
                <span className="font-mono font-bold text-rose-400">-₹{metrics.totalDiscounts.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-3 flex justify-between items-center text-sm bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold">3. Net Product Sales (Gross - Discounts)</span>
                <span className="font-mono font-extrabold text-emerald-400">₹{metrics.netSales.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-3 flex justify-between items-center text-sm">
                <span className="text-slate-300 font-medium">4. Plus: GST / Government Tax Collected</span>
                <span className="font-mono font-bold text-blue-400">+₹{metrics.totalTax.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-3 flex justify-between items-center text-sm">
                <span className="text-slate-300 font-medium">5. Plus: Delivery & Logistics Fees</span>
                <span className="font-mono font-bold text-purple-400">+₹{metrics.totalDelivery.toLocaleString('en-IN')}</span>
              </div>

              <div className="pt-4 flex justify-between items-center text-base bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30">
                <span className="text-emerald-300 font-black">NET TOTAL REVENUE COLLECTED</span>
                <span className="font-mono font-black text-emerald-400 text-lg">₹{metrics.totalNetRevenue.toLocaleString('en-IN')}</span>
              </div>

            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>💳</span>
                <span>Payment Method Breakdown</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{paymentAnalytics.length} channels</span>
            </div>

            <div className="space-y-4">
              {paymentAnalytics.map(channel => (
                <div key={channel.name} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{channel.icon}</span>
                      <span className="font-bold text-white">{channel.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-black ${channel.color}`}>₹{channel.revenue.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-500 block">({channel.count} orders • {channel.sharePct}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${channel.sharePct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DAILY SALES LEDGER */}
      {(activeReportTab === 'daily' || activeReportTab === 'overview') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📅</span>
                <span>Daily Sales Ledger Report</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Day-by-day aggregate breakdown of orders, gross sales, discounts, tax, delivery fees, and net revenue.
              </p>
            </div>

            <button
              onClick={() => exportDailyReportToCSV(dailySales, `Bun_Maska_Daily_Sales_${timeRange}`)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
            >
              <span>📥</span>
              <span>Export Daily Report (.CSV)</span>
            </button>
          </div>

          {dailySales.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No daily sales records match the selected date filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Tax (GST)</th>
                    <th className="py-3 px-4 text-right">Delivery Fees</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-right">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {dailySales.map(row => (
                    <tr key={row.dateKey} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">{row.dateStr}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">{row.orderCount}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{row.grossSales.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-400">-₹{row.discounts.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">₹{row.netSales.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-blue-400">₹{row.tax.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-purple-400">₹{row.delivery.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400">₹{row.totalRevenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">₹{row.aov}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BEST SELLERS & PRODUCT PROFITABILITY */}
      {(activeReportTab === 'products' || activeReportTab === 'overview') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🍔</span>
                <span>Best-Selling Products & Profitability Report</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Item-level analysis of units sold, gross sales revenue, estimated COGS, gross profit margins, and profitability rankings.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort By Dropdown */}
              <select
                value={productSortBy}
                onChange={e => setProductSortBy(e.target.value)}
                className="bg-slate-950 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="profit">Sort by Gross Profit (₹)</option>
                <option value="qty">Sort by Quantity Sold</option>
                <option value="revenue">Sort by Total Revenue (₹)</option>
                <option value="margin">Sort by Margin %</option>
              </select>

              <button
                onClick={() => exportProfitabilityToCSV(productAnalytics, `Bun_Maska_Product_Profitability_${timeRange}`)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <span>📥</span>
                <span>Export Profitability (.CSV)</span>
              </button>
            </div>
          </div>

          {productAnalytics.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No product sales records recorded yet for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rank & Product Title</th>
                    <th className="py-3 px-4 text-center">Qty Sold</th>
                    <th className="py-3 px-4 text-right">Avg Retail Price</th>
                    <th className="py-3 px-4 text-right">Est. Unit COGS</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Total COGS</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {productAnalytics.map((item, idx) => (
                    <tr key={item.slug} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <div>
                          <div>{item.title}</div>
                          <span className="text-[10px] text-slate-500 font-normal">{item.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-amber-400">{item.qty} sold</td>
                      <td className="py-3 px-4 text-right font-mono">₹{item.unitPrice}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">₹{item.unitCost}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">₹{item.totalRevenue.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-400">₹{item.totalCost.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400">₹{item.grossProfit.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          item.marginPct >= 60 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REPEAT CUSTOMERS & RETENTION */}
      {(activeReportTab === 'customers' || activeReportTab === 'overview') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👥</span>
                <span>Repeat Customers & Retention Analysis</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Customer loyalty metrics comparing first-time buyers vs repeat customers, order frequencies, and lifetime value.
              </p>
            </div>

            <button
              onClick={() => exportRepeatCustomersToCSV(customerAnalytics.allCustomers, `Bun_Maska_Customer_Retention_${timeRange}`)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
            >
              <span>📥</span>
              <span>Export Customers CSV</span>
            </button>
          </div>

          {/* Retention Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Unique Buyers</span>
              <div className="text-2xl font-black text-white mt-1">{customerAnalytics.totalCustomers}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-purple-400 uppercase">Repeat Customers (2+ Orders)</span>
              <div className="text-2xl font-black text-purple-400 mt-1">{customerAnalytics.repeatCount}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs font-bold text-emerald-400 uppercase">Repeat Customer Rate</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">{customerAnalytics.repeatRate}%</div>
            </div>
          </div>

          {/* Top Repeat Loyal Customers Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">🌟 Top Loyal Repeat Customers</h4>
            
            {customerAnalytics.topLoyalCustomers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No customer records available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-center">Total Orders</th>
                      <th className="py-3 px-4 text-right">Lifetime Spent</th>
                      <th className="py-3 px-4 text-right">AOV</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {customerAnalytics.topLoyalCustomers.map(c => (
                      <tr key={c.key} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{c.contact}</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-amber-400">{c.orderCount} orders</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">₹{c.totalSpent.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">₹{c.aov}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isRepeat ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {c.isRepeat ? '🔁 Repeat Customer' : '1st Order'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PEAK ORDERING TIME & HOURLY HEATMAP */}
      {(activeReportTab === 'peak_payment' || activeReportTab === 'overview') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⏰</span>
              <span>Peak Ordering Time & Hourly Heatmap</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              24-Hour ordering volume distribution identifying busiest peak hours and ordering rushes.
            </p>
          </div>

          {/* Top 3 Peak Hours Highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {hourlyAnalytics.peakHours.map((h, idx) => (
              <div key={h.hour} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">#{idx + 1} Peak Rush Window</span>
                  <div className="text-sm font-black text-amber-400 mt-0.5">{h.label} - {h.hour === 23 ? '12 AM' : hourlyAnalytics.hours[h.hour + 1]?.label}</div>
                  <span className="text-[11px] text-slate-400 font-mono">{h.orderCount} orders • ₹{h.revenue.toLocaleString('en-IN')}</span>
                </div>
                <span className="text-2xl">🔥</span>
              </div>
            ))}
          </div>

          {/* 24-Hour Bar Visualizer */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">24-Hour Volume Histogram</h4>
            <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 items-end h-32 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              {hourlyAnalytics.hours.map(h => {
                const heightPct = hourlyAnalytics.maxOrders > 0 ? (h.orderCount / hourlyAnalytics.maxOrders) * 100 : 0;

                return (
                  <div key={h.hour} className="flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden group-hover:flex flex-col items-center bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 font-mono">
                      <span>{h.label}: {h.orderCount} orders</span>
                    </div>

                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        h.orderCount > 0 ? 'bg-gradient-to-t from-amber-500 to-amber-300 hover:brightness-125' : 'bg-slate-800/40'
                      }`}
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    ></div>
                    <span className="text-[9px] text-slate-500 mt-1 font-mono">{h.hour}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
