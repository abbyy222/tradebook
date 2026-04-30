import {
  buildPdfFileFromHtml,
  downloadPdfDocument,
  openPrintDocument,
  sharePdfDocument,
} from './document'

export type ReceiptPayload = {
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

export const buildReceiptHtml = (payload: ReceiptPayload) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${payload.receiptNumber}</title>
    <style>
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #24150f;
        background: #f7f1ea;
        padding: 20px;
      }
      .receipt {
        max-width: 520px;
        margin: 0 auto;
        border: 1px solid #e7d5c4;
        border-radius: 24px;
        padding: 24px;
        background: linear-gradient(180deg, #fffdfa 0%, #fff7ef 100%);
        box-shadow: 0 20px 60px rgba(47, 24, 12, 0.12);
      }
      h1 {
        font-size: 22px;
        margin: 0 0 6px;
        color: #231510;
      }
      .muted {
        color: #745846;
        font-size: 12px;
        margin: 3px 0;
      }
      .line {
        border-top: 1px dashed #cfb49d;
        margin: 16px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 13px;
        margin: 10px 0;
      }
      .total {
        font-weight: 700;
        font-size: 18px;
        color: #b44d1f;
      }
      .pill {
        display: inline-block;
        margin-top: 8px;
        padding: 7px 10px;
        border-radius: 999px;
        background: rgba(232, 168, 56, 0.12);
        border: 1px solid rgba(232, 168, 56, 0.22);
        color: #9d6505;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .thankyou {
        margin-top: 18px;
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(192, 72, 24, 0.06);
        color: #5d4334;
        font-size: 13px;
      }
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
        .receipt {
          border: none;
          margin: 0;
          max-width: none;
          box-shadow: none;
          border-radius: 0;
          padding: 0;
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
      <span class="pill">TradeBook Sale Receipt</span>
      <p class="thankyou">Thank you for your purchase. Keep this slip as your proof of payment.</p>
    </div>
    <script>
      window.onload = function () {
        window.print();
      };
    </script>
  </body>
</html>`

export const printReceipt = (payload: ReceiptPayload) => {
  return openPrintDocument({
    html: buildReceiptHtml(payload),
    width: 520,
    height: 760,
  })
}

const buildReceiptPdfFile = (payload: ReceiptPayload) =>
  buildPdfFileFromHtml({
    html: buildReceiptHtml(payload),
    fileName: `tradebook-receipt-${payload.receiptNumber}.pdf`,
  })

export const downloadReceipt = async (payload: ReceiptPayload) => {
  const file = await buildReceiptPdfFile(payload)
  await downloadPdfDocument({ file })
}

export const shareReceipt = async (payload: ReceiptPayload) => {
  const file = await buildReceiptPdfFile(payload)
  return sharePdfDocument({
    title: `Receipt ${payload.receiptNumber}`,
    file,
    fallbackText: buildReceiptText(payload),
    fallbackMessage: 'PDF downloaded. Share the receipt from your files if this device cannot share PDF files directly.',
  })
}
