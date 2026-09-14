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
  downloadCSVBlob(csvString, `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`)
}

function downloadCSVBlob(csvContent, filename) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportDailyReportToCSV(dailyRows = [], filenamePrefix = 'Bun_Maska_Daily_Sales') {
  if (!dailyRows || !dailyRows.length) {
    alert('No daily report data to export.')
    return
  }
  const headers = ['Date', 'Total Orders', 'Gross Sales (₹)', 'Discounts (₹)', 'Net Sales (₹)', 'Tax Collected (₹)', 'Delivery Fees (₹)', 'Total Revenue (₹)', 'AOV (₹)']
  const rows = dailyRows.map(r => [
    `"${r.dateStr}"`,
    r.orderCount,
    r.grossSales.toFixed(2),
    r.discounts.toFixed(2),
    r.netSales.toFixed(2),
    r.tax.toFixed(2),
    r.delivery.toFixed(2),
    r.totalRevenue.toFixed(2),
    r.aov.toFixed(2),
  ].join(','))
  downloadCSVBlob([headers.join(','), ...rows].join('\r\n'), `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportProfitabilityToCSV(profitRows = [], filenamePrefix = 'Bun_Maska_Product_Profitability') {
  if (!profitRows || !profitRows.length) {
    alert('No product profitability data to export.')
    return
  }
  const headers = ['Product Name', 'Category', 'Qty Sold', 'Avg Unit Price (₹)', 'Est. Unit Cost (₹)', 'Total Revenue (₹)', 'Total COGS (₹)', 'Gross Profit (₹)', 'Margin %']
  const rows = profitRows.map(p => [
    `"${p.title.replace(/"/g, '""')}"`,
    `"${(p.category || 'General').replace(/"/g, '""')}"`,
    p.qty,
    p.unitPrice.toFixed(2),
    p.unitCost.toFixed(2),
    p.totalRevenue.toFixed(2),
    p.totalCost.toFixed(2),
    p.grossProfit.toFixed(2),
    `${p.marginPct.toFixed(1)}%`,
  ].join(','))
  downloadCSVBlob([headers.join(','), ...rows].join('\r\n'), `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportRepeatCustomersToCSV(customerRows = [], filenamePrefix = 'Bun_Maska_Customer_Retention') {
  if (!customerRows || !customerRows.length) {
    alert('No customer data to export.')
    return
  }
  const headers = ['Customer Name', 'Phone / Email', 'Total Orders', 'Total Spent (₹)', 'Average Order Value (₹)', 'Customer Type']
  const rows = customerRows.map(c => [
    `"${c.name.replace(/"/g, '""')}"`,
    `"${c.contact.replace(/"/g, '""')}"`,
    c.orderCount,
    c.totalSpent.toFixed(2),
    c.aov.toFixed(2),
    `"${c.isRepeat ? 'Repeat Customer' : 'Single Order'}"`,
  ].join(','))
  downloadCSVBlob([headers.join(','), ...rows].join('\r\n'), `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`)
}
