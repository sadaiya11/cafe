/**
 * Helper utility to export order & financial ledgers into CSV Excel spreadsheet files.
 */
export function exportOrdersToCSV(orders = [], filenamePrefix = 'Bun_Maska_Sales_Report') {
  if (!orders || !orders.length) {
    alert('No order records available to export.')
    return
  }

  const headers = [
    'Order ID',
    'Date & Time',
    'Customer Name',
    'Customer Phone',
    'Customer Email',
    'Delivery Address',
    'Ordered Items',
    'Payment Method',
    'Payment Status',
    'Payment Transaction ID',
    'Total Amount (₹)',
    'Order Status'
  ]

  const rows = orders.map((o) => {
    const customer = o.customer || {}
    const name = o.customerName || customer.name || customer.fullName || 'Guest Customer'
    const phone = o.customerPhone || customer.phone || customer.mobile || ''
    const email = o.customerEmail || customer.email || ''
    const address = [customer.address, customer.city, customer.zip].filter(Boolean).join(', ') || o.customerAddress || ''
    
    const items = Array.isArray(o.items) ? o.items : Array.isArray(o.order_items) ? o.order_items : []
    const itemsSummary = items.map((i) => `${i.quantity || 1}x ${i.title || i.name || 'Item'} (${i.size || i.sizeLabel || 'Standard'})`).join(' | ')

    const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : 'Recent'
    const method = (o.paymentMethod || o.payment_method || 'COD').toUpperCase()
    const paymentStatus = o.paymentStatus || o.payment_status || (method === 'RAZORPAY' ? 'SUCCESS' : 'PENDING')
    const paymentId = o.paymentId || o.razorpayPaymentId || o.razorpay_payment_id || (method === 'COD' ? `COD_${o.orderId || o.id}` : 'N/A')
    const total = Number(o.amount || o.totalAmount || o.total || 0).toFixed(2)
    const status = o.status || 'CONFIRMED'

    return [
      `"${(o.orderId || o.id || '').toString().replace(/"/g, '""')}"`,
      `"${dateStr.replace(/"/g, '""')}"`,
      `"${name.replace(/"/g, '""')}"`,
      `"${phone.replace(/"/g, '""')}"`,
      `"${email.replace(/"/g, '""')}"`,
      `"${address.replace(/"/g, '""')}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      `"${method.replace(/"/g, '""')}"`,
      `"${paymentStatus.replace(/"/g, '""')}"`,
      `"${paymentId.replace(/"/g, '""')}"`,
      total,
      `"${status.replace(/"/g, '""')}"`
    ].join(',')
  })

  const csvString = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
