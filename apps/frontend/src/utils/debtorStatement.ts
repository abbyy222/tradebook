import type { DebtorStatementDTO } from '@tradebook/shared-types'
import {
  buildPdfFileFromHtml,
  downloadPdfDocument,
  openPrintDocument,
  sharePdfDocument,
} from './document'

const fmt = (n: number) => 'NGN ' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const buildDebtorStatementText = (data: DebtorStatementDTO) => {
  const lines = [
    'Debtor Statement',
    `Customer: ${data.debtor.customerName}`,
    data.debtor.phoneNumber ? `Phone: ${data.debtor.phoneNumber}` : '',
    `Generated: ${formatDateTime(data.generatedAt)}`,
    '',
    `Total credit sales: ${fmt(data.totals.totalSalesOnCredit)}`,
    `Total payments: ${fmt(data.totals.totalPayments)}`,
    `Balance: ${fmt(data.totals.balance)}`,
    '',
    'Timeline:',
    ...data.entries.map(
      (entry) =>
        `${entry.type === 'SALE' ? 'Sale' : 'Payment'} | ${formatDateTime(entry.date)} | ${fmt(entry.amount)} | Balance: ${fmt(entry.balanceAfter)}${entry.reference ? ` | ${entry.reference}` : ''}${entry.note ? ` | ${entry.note}` : ''}`,
    ),
  ]

  return lines.filter(Boolean).join('\n')
}

export const buildDebtorStatementHtml = (data: DebtorStatementDTO) => {
  const rows = data.entries
    .map(
      (entry) => `
      <tr>
        <td>${entry.type === 'SALE' ? 'Credit sale' : 'Payment'}</td>
        <td>${formatDateTime(entry.date)}</td>
        <td>${entry.reference ?? '-'}</td>
        <td>${entry.note ?? '-'}</td>
        <td>${fmt(entry.amount)}</td>
        <td>${fmt(entry.balanceAfter)}</td>
      </tr>
    `,
    )
    .join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Statement ${data.debtor.customerName}</title>
    <style>
      body { margin: 0; padding: 24px; background: #f7f1ea; font-family: "Segoe UI", Arial, sans-serif; color: #231510; }
      .sheet { max-width: 920px; margin: 0 auto; background: linear-gradient(180deg, #fffdfa 0%, #fff7ef 100%); border: 1px solid #e7d5c4; border-radius: 28px; padding: 28px; box-shadow: 0 24px 70px rgba(47, 24, 12, 0.12); }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .muted { color: #745846; font-size: 13px; margin: 3px 0; }
      .pill { display: inline-block; margin-top: 14px; padding: 8px 12px; border-radius: 999px; background: rgba(232, 168, 56, 0.12); border: 1px solid rgba(232, 168, 56, 0.22); color: #9d6505; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .card { border: 1px solid #ead7c7; border-radius: 18px; padding: 16px; background: rgba(255,255,255,0.65); }
      .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8f6f5b; font-weight: 700; }
      .value { margin-top: 8px; font-size: 24px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; margin-top: 18px; overflow: hidden; border-radius: 18px; }
      thead th { background: #f3e6d8; color: #6a4d3f; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 12px 10px; text-align: left; }
      tbody td { border-top: 1px solid #eddccc; padding: 12px 10px; font-size: 13px; vertical-align: top; }
      .note { margin-top: 18px; padding: 16px; border-radius: 18px; background: rgba(192, 72, 24, 0.06); color: #5d4334; font-size: 13px; }
      @media print {
        body { padding: 0; background: #fff; }
        .sheet { max-width: none; border: none; border-radius: 0; box-shadow: none; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>Debtor Statement</h1>
      <p class="muted">Customer: ${data.debtor.customerName}</p>
      ${data.debtor.phoneNumber ? `<p class="muted">Phone: ${data.debtor.phoneNumber}</p>` : ''}
      <p class="muted">Generated: ${formatDateTime(data.generatedAt)}</p>
      <span class="pill">TradeBook Statement</span>

      <div class="grid">
        <div class="card">
          <div class="label">Credit sales</div>
          <div class="value">${fmt(data.totals.totalSalesOnCredit)}</div>
        </div>
        <div class="card">
          <div class="label">Payments</div>
          <div class="value">${fmt(data.totals.totalPayments)}</div>
        </div>
        <div class="card">
          <div class="label">Balance</div>
          <div class="value">${fmt(data.totals.balance)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Date</th>
            <th>Reference</th>
            <th>Note</th>
            <th>Amount</th>
            <th>Balance After</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="note">This statement was prepared from your TradeBook debtor ledger and payment history.</div>

      <script>window.onload = () => window.print()</script>
    </div>
  </body>
</html>`
}

export const printDebtorStatement = (data: DebtorStatementDTO) =>
  openPrintDocument({
    html: buildDebtorStatementHtml(data),
    width: 1080,
    height: 820,
  })

const buildDebtorStatementPdfFile = (data: DebtorStatementDTO) =>
  buildPdfFileFromHtml({
    html: buildDebtorStatementHtml(data),
    fileName: `tradebook-statement-${data.debtor.customerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
  })

export const downloadDebtorStatement = async (data: DebtorStatementDTO) => {
  const file = await buildDebtorStatementPdfFile(data)
  await downloadPdfDocument({ file })
}

export const shareDebtorStatement = async (data: DebtorStatementDTO) => {
  const file = await buildDebtorStatementPdfFile(data)
  return sharePdfDocument({
    title: `Statement - ${data.debtor.customerName}`,
    file,
    fallbackText: buildDebtorStatementText(data),
    fallbackMessage: 'PDF downloaded. Share the statement from your files if this device cannot share PDF files directly.',
  })
}
