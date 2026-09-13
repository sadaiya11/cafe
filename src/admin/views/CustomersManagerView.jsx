import { useState, useEffect, useMemo } from 'react'
import { fetchAdminUsers } from '../services/adminApi'

export default function CustomersManagerView({ orders = [] }) {
  const [dbUsers, setDbUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    fetchAdminUsers().then((users) => {
      if (isMounted) {
        setDbUsers(users || [])
        setIsLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Aggregate registered database users and guest orders into customer profiles
  const customerProfiles = useMemo(() => {
    const map = new Map()

    // 1. Add all registered users from database
    dbUsers.forEach((u) => {
      const emailKey = u.email ? u.email.trim().toLowerCase() : ''
      if (!emailKey) return

      map.set(emailKey, {
        id: u.id,
        name: u.name || 'Registered Customer',
        email: emailKey,
        phone: u.phone || '',
        address: u.address || '',
        city: u.city || '',
        zip: u.zip || '',
        role: u.role || 'CUSTOMER',
        createdAt: u.createdAt || u.created_at,
        orders: [],
        ordersCount: 0,
        totalSpent: 0,
      })
    })

    // 2. Attach orders and include guest customers
    orders.forEach((o) => {
      const cust = o.customer || {}
      const emailKey = (cust.email || o.email || '').trim().toLowerCase()
      const phoneVal = cust.phone || o.phone || ''
      const addressVal = cust.address || o.address || ''
      const cityVal = cust.city || o.city || ''
      const zipVal = cust.zip || o.zip || ''
      const nameVal = cust.name || o.customerName || 'Guest Customer'
      const amount = Number(o.totalAmount ?? o.amount ?? o.total ?? 0)

      const key = emailKey || (phoneVal ? `phone_${phoneVal}` : `order_${o.id || o.orderId}`)

      if (!map.has(key)) {
        map.set(key, {
          id: `guest-${key}`,
          name: nameVal,
          email: emailKey || 'Guest (No email)',
          phone: phoneVal,
          address: addressVal,
          city: cityVal,
          zip: zipVal,
          role: 'GUEST',
          createdAt: o.createdAt || o.created_at,
          orders: [],
          ordersCount: 0,
          totalSpent: 0,
        })
      }

      const profile = map.get(key)
      profile.orders.push(o)
      profile.ordersCount += 1
      profile.totalSpent += amount

      // Fill missing address/phone from order if not set
      if (!profile.phone && phoneVal) profile.phone = phoneVal
      if (!profile.address && addressVal) profile.address = addressVal
      if (!profile.city && cityVal) profile.city = cityVal
      if (!profile.zip && zipVal) profile.zip = zipVal
    })

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent)
  }, [dbUsers, orders])

  // Search Filter
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customerProfiles
    const q = searchTerm.trim().toLowerCase()
    return customerProfiles.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q),
    )
  }, [customerProfiles, searchTerm])

  const totalRevenueAllCustomers = useMemo(() => {
    return customerProfiles.reduce((sum, c) => sum + c.totalSpent, 0)
  }, [customerProfiles])

  return (
    <div className="space-y-6">
      {/* View Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>👥 Customer Directory & Orders History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View customer names, phone numbers, delivery addresses, order items, and total lifetime spend.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search name, phone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Customers</span>
          <div className="text-2xl font-black text-white">{customerProfiles.length}</div>
          <p className="text-[11px] text-slate-500">Registered & Guest Buyers</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Combined Lifetime Spend</span>
          <div className="text-2xl font-black text-amber-400">₹{totalRevenueAllCustomers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <p className="text-[11px] text-slate-500">Total customer order value</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Avg Spend / Customer</span>
          <div className="text-2xl font-black text-emerald-400">
            ₹
            {customerProfiles.length > 0
              ? (totalRevenueAllCustomers / customerProfiles.length).toFixed(2)
              : '0.00'}
          </div>
          <p className="text-[11px] text-slate-500">Customer Lifetime Value (LTV)</p>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Customer Name & Email</th>
                <th className="px-5 py-3.5">Phone Number</th>
                <th className="px-5 py-3.5">Saved Delivery Address</th>
                <th className="px-5 py-3.5 text-center">Orders Count</th>
                <th className="px-5 py-3.5 text-right">Total Spent</th>
                <th className="px-5 py-3.5 text-center">Order Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400 animate-pulse">
                    Loading customer directory from server...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                    No matching customer records found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <tr key={customer.id || idx} className="hover:bg-slate-800/40 transition">
                    {/* Customer Name & Email */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-sm shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{customer.name}</div>
                          <div className="text-[11px] text-slate-400">{customer.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Phone Number */}
                    <td className="px-5 py-4 font-bold text-slate-200">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="hover:text-amber-400 transition flex items-center gap-1.5">
                          <span>📞</span> {customer.phone}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">Not set</span>
                      )}
                    </td>

                    {/* Delivery Address */}
                    <td className="px-5 py-4 max-w-xs">
                      {customer.address || customer.city ? (
                        <div>
                          <div className="text-slate-200 font-medium line-clamp-1" title={customer.address}>
                            📍 {customer.address || 'Street address not specified'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {[customer.city, customer.zip].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No saved address</span>
                      )}
                    </td>

                    {/* Orders Count */}
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-800 text-amber-300 border border-slate-700">
                        {customer.ordersCount} Orders
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="px-5 py-4 text-right font-black text-amber-400 text-sm">
                      ₹{customer.totalSpent.toFixed(2)}
                    </td>

                    {/* Action: View Customer Orders */}
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-sm"
                      >
                        👁️ View Orders ({customer.ordersCount})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER ORDERS & BREAKDOWN MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Customer Profile & Order History
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2">
                  <span>👤 {selectedCustomer.name}</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="h-9 w-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Contact Details & Order List */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Customer Quick Summary Header Card */}
              <div className="grid gap-4 md:grid-cols-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Phone Number</span>
                  <span className="text-xs font-bold text-slate-200">{selectedCustomer.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Email Address</span>
                  <span className="text-xs font-bold text-slate-200">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Delivery Address</span>
                  <span className="text-xs font-bold text-slate-200">
                    {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.zip].filter(Boolean).join(', ') || 'None saved'}
                  </span>
                </div>
              </div>

              {/* Combined Total Spend Highlight Banner */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Customer Lifetime Value</span>
                  <p className="text-xs text-slate-400">Total spent across all orders placed by this customer</p>
                </div>
                <div className="text-2xl font-black text-amber-400">
                  ₹{selectedCustomer.totalSpent.toFixed(2)}
                </div>
              </div>

              {/* Customer Orders Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>📜 Order History ({selectedCustomer.orders.length} Total Orders)</span>
                </h4>

                {selectedCustomer.orders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                    No orders placed yet by this customer account.
                  </div>
                ) : (
                  selectedCustomer.orders.map((order, orderIdx) => {
                    const orderItems = Array.isArray(order.items) ? order.items : []
                    const orderTotal = Number(order.totalAmount ?? order.amount ?? order.total ?? 0)

                    return (
                      <div key={order.id || order.orderId || orderIdx} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-amber-400 text-sm">#{order.orderId || order.id}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                order.status === 'DELIVERED' || order.status === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : order.status === 'CANCELLED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}>
                                {order.status || 'PENDING'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              📅 {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'Recent Order'}
                              {order.paymentMethod && <span className="ml-2 font-semibold text-slate-300">• {order.paymentMethod}</span>}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">Order Total</span>
                            <span className="text-base font-black text-amber-400">₹{orderTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Order Items Table */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ordered Food Items & Prices:</span>

                          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-800">
                                <tr>
                                  <th className="px-3.5 py-2">Item Title & Size</th>
                                  <th className="px-3.5 py-2 text-center">Qty</th>
                                  <th className="px-3.5 py-2 text-right">Price per Item</th>
                                  <th className="px-3.5 py-2 text-right">Item Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {orderItems.length === 0 ? (
                                  <tr>
                                    <td colSpan="4" className="px-3.5 py-3 text-center text-slate-500 italic">
                                      No item details logged for this order.
                                    </td>
                                  </tr>
                                ) : (
                                  orderItems.map((item, itemIdx) => {
                                    const itemPrice = Number(item.price || 0)
                                    const qty = Number(item.quantity || 1)
                                    const itemTotal = itemPrice * qty

                                    return (
                                      <tr key={itemIdx} className="hover:bg-slate-800/30 transition">
                                        <td className="px-3.5 py-2 font-bold text-white">
                                          {item.title || item.name || 'Food Item'}
                                          {item.size && item.size !== 'standard' && (
                                            <span className="ml-1 text-[10px] font-normal text-amber-400">({item.size})</span>
                                          )}
                                        </td>
                                        <td className="px-3.5 py-2 text-center font-extrabold text-amber-300">
                                          x{qty}
                                        </td>
                                        <td className="px-3.5 py-2 text-right font-medium text-slate-300">
                                          ₹{itemPrice.toFixed(2)}
                                        </td>
                                        <td className="px-3.5 py-2 text-right font-bold text-amber-400">
                                          ₹{itemTotal.toFixed(2)}
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Customer Email: <strong className="text-slate-200">{selectedCustomer.email}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
