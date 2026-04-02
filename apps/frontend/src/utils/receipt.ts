type ReceiptPayload = {
  receiptNumber: string
  businessName: string
  traderName?: string
  phoneNumber?: string
  soldAt: string
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
  paymentType: 'CASH' | 'TRANSFER' | 'DEBT'
  debtorName?: string
}

const formatMoney = (value: number) => `NGN ${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const buildReceiptText = (payload: ReceiptPayload) => {
  return [
    `${payload.businessName}`,
    payload.traderName ? `By: ${payload.traderName}` : '',
    payload.phoneNumber ? `Phone: ${payload.phoneNumber}` : '',
    '',
    `Receipt No: ${payload.receiptNumber}`,
    `Date: ${formatDateTime(payload.soldAt)}`,
    '',
    `Item: ${payload.itemName}`,
    `Qty: ${payload.quantity}`,
    `Unit Price: ${formatMoney(payload.unitPrice)}`,
    `Total: ${formatMoney(payload.amount)}`,
    `Payment: ${payload.paymentType}`,
    payload.debtorName ? `Customer: ${payload.debtorName}` : '',
    '',
    'Thank you for your purchase.',
  ]
    .filter(Boolean)
    .join('\n')
}

export const printReceipt = (payload: ReceiptPayload) => {
  const receiptHtml = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${payload.receiptNumber}</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        color: #111;
        background: #fff;
      }
      .receipt {
        max-width: 360px;
        margin: 16px auto;
        border: 1px solid #ddd;
        padding: 16px;
      }
      h1 {
        font-size: 16px;
        margin: 0 0 4px;
      }
      .muted {
        color: #666;
        font-size: 12px;
        margin: 0;
      }
      .line {
        border-top: 1px dashed #bbb;
        margin: 12px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 13px;
        margin: 6px 0;
      }
      .total {
        font-weight: 700;
        font-size: 15px;
      }
      @media print {
        .receipt {
          border: none;
          margin: 0;
          max-width: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      <h1>${payload.businessName}</h1>
      ${payload.traderName ? `<p class="muted">By: ${payload.traderName}</p>` : ''}
      ${payload.phoneNumber ? `<p class="muted">Phone: ${payload.phoneNumber}</p>` : ''}
      <div class="line"></div>
      <div class="row"><span>Receipt No</span><strong>${payload.receiptNumber}</strong></div>
      <div class="row"><span>Date</span><span>${formatDateTime(payload.soldAt)}</span></div>
      <div class="line"></div>
      <div class="row"><span>Item</span><span>${payload.itemName}</span></div>
      <div class="row"><span>Qty</span><span>${payload.quantity}</span></div>
      <div class="row"><span>Unit Price</span><span>${formatMoney(payload.unitPrice)}</span></div>
      <div class="row total"><span>Total</span><span>${formatMoney(payload.amount)}</span></div>
      <div class="row"><span>Payment</span><span>${payload.paymentType}</span></div>
      ${payload.debtorName ? `<div class="row"><span>Customer</span><span>${payload.debtorName}</span></div>` : ''}
      <div class="line"></div>
      <p class="muted">Thank you for your purchase.</p>
    </div>
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`

  const printWindow = window.open('', '_blank', 'width=420,height=700')
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(receiptHtml)
  printWindow.document.close()
  return true
}

