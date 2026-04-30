import type { DayCloseSummaryDTO } from '@tradebook/shared-types'
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

export const buildDayCloseText = ({
  businessName,
  summary,
}: {
  businessName: string
  summary: DayCloseSummaryDTO
}) => {
  return [
    `${businessName} - Day Close Summary`,
    `Period: ${summary.period.label}`,
    summary.closure.closedAt ? `Closed at: ${formatDateTime(summary.closure.closedAt)}` : 'Status: Not yet closed',
    summary.closure.note ? `Note: ${summary.closure.note}` : '',
    '',
    `Sales: ${fmt(summary.sales.total)} (${summary.sales.count} records)`,
    `Cash sales: ${fmt(summary.sales.cashTotal)}`,
    `Transfer sales: ${fmt(summary.sales.transferTotal)}`,
    `Credit sales: ${fmt(summary.sales.debtTotal)}`,
    `Expenses: ${fmt(summary.expenses.total)} (${summary.expenses.count} records)`,
    `Debtor collections: ${fmt(summary.collections.total)} (${summary.collections.count} records)`,
    `Savings logged: ${fmt(summary.savings.total)} (${summary.savings.count} entries)`,
    `Reconciled savings: ${summary.savings.reconciledCount}`,
    `Verified savings: ${summary.savings.verifiedCount}`,
    '',
    `Net after expenses: ${fmt(summary.net.operatingBalance)}`,
    `Eligible sales after expenses: ${fmt(summary.net.eligibleSalesAfterExpenses)}`,
    `Still free to save: ${fmt(summary.net.stillAvailableToSave)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export const buildDayCloseHtml = ({
  businessName,
  ownerName,
  summary,
}: {
  businessName: string
  ownerName?: string
  summary: DayCloseSummaryDTO
}) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${businessName} Day Close</title>
    <style>
      body { margin: 0; padding: 24px; background: #f7f1ea; font-family: "Segoe UI", Arial, sans-serif; color: #231510; }
      .sheet { max-width: 920px; margin: 0 auto; background: linear-gradient(180deg, #fffdfa 0%, #fff7ef 100%); border: 1px solid #e7d5c4; border-radius: 28px; padding: 28px; box-shadow: 0 24px 70px rgba(47, 24, 12, 0.12); }
      h1 { margin: 0 0 8px; font-size: 30px; }
      .muted { color: #745846; font-size: 13px; margin: 3px 0; }
      .pill { display: inline-block; margin-top: 14px; padding: 8px 12px; border-radius: 999px; background: rgba(232, 168, 56, 0.12); border: 1px solid rgba(232, 168, 56, 0.22); color: #9d6505; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .card { border: 1px solid #ead7c7; border-radius: 18px; padding: 16px; background: rgba(255,255,255,0.65); }
      .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8f6f5b; font-weight: 700; }
      .value { margin-top: 8px; font-size: 24px; font-weight: 800; }
      .two-col { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; margin-top: 16px; }
      .panel { border: 1px solid #ead7c7; border-radius: 22px; padding: 18px; background: rgba(255,255,255,0.72); }
      .note { margin-top: 16px; padding: 16px; border-radius: 18px; background: rgba(192, 72, 24, 0.06); color: #5d4334; font-size: 13px; }
      .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px dashed #e7d5c4; font-size: 13px; }
      .row:first-child { border-top: none; padding-top: 0; }
      @media print {
        body { padding: 0; background: #fff; }
        .sheet { max-width: none; border: none; border-radius: 0; box-shadow: none; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>${businessName}</h1>
      <p class="muted">Day close summary for ${summary.period.label}</p>
      ${ownerName ? `<p class="muted">Prepared by: ${ownerName}</p>` : ''}
      ${summary.closure.closedAt ? `<p class="muted">Closed at: ${formatDateTime(summary.closure.closedAt)}</p>` : `<p class="muted">Status: Not yet closed</p>`}
      <span class="pill">TradeBook Day Close</span>

      <div class="grid">
        <div class="card"><div class="label">Sales</div><div class="value">${fmt(summary.sales.total)}</div></div>
        <div class="card"><div class="label">Expenses</div><div class="value">${fmt(summary.expenses.total)}</div></div>
        <div class="card"><div class="label">Collections</div><div class="value">${fmt(summary.collections.total)}</div></div>
        <div class="card"><div class="label">Saved</div><div class="value">${fmt(summary.savings.total)}</div></div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="label">Today&apos;s money flow</div>
          <div class="row"><span>Cash sales</span><strong>${fmt(summary.sales.cashTotal)}</strong></div>
          <div class="row"><span>Transfer sales</span><strong>${fmt(summary.sales.transferTotal)}</strong></div>
          <div class="row"><span>Credit sales</span><strong>${fmt(summary.sales.debtTotal)}</strong></div>
          <div class="row"><span>Expenses</span><strong>${fmt(summary.expenses.total)}</strong></div>
          <div class="row"><span>Debtor collections</span><strong>${fmt(summary.collections.total)}</strong></div>
        </div>
        <div class="panel">
          <div class="label">Savings discipline</div>
          <div class="row"><span>Net after expenses</span><strong>${fmt(summary.net.operatingBalance)}</strong></div>
          <div class="row"><span>Eligible sales after expenses</span><strong>${fmt(summary.net.eligibleSalesAfterExpenses)}</strong></div>
          <div class="row"><span>Still free to save</span><strong>${fmt(summary.net.stillAvailableToSave)}</strong></div>
          <div class="row"><span>Reconciled savings</span><strong>${summary.savings.reconciledCount}</strong></div>
          <div class="row"><span>Verified savings</span><strong>${summary.savings.verifiedCount}</strong></div>
        </div>
      </div>

      ${summary.closure.note ? `<div class="note"><strong>Close note:</strong> ${summary.closure.note}</div>` : ''}

      <script>window.onload = () => window.print()</script>
    </div>
  </body>
</html>`

export const printDayCloseSummary = (payload: {
  businessName: string
  ownerName?: string
  summary: DayCloseSummaryDTO
}) =>
  openPrintDocument({
    html: buildDayCloseHtml(payload),
    width: 1080,
    height: 820,
  })

const buildDayClosePdfFile = (payload: {
  businessName: string
  ownerName?: string
  summary: DayCloseSummaryDTO
}) =>
  buildPdfFileFromHtml({
    html: buildDayCloseHtml(payload),
    fileName: `tradebook-day-close-${payload.summary.period.from.slice(0, 10)}.pdf`,
  })

export const downloadDayCloseSummary = async (payload: {
  businessName: string
  ownerName?: string
  summary: DayCloseSummaryDTO
}) => {
  const file = await buildDayClosePdfFile(payload)
  await downloadPdfDocument({ file })
}

export const shareDayCloseSummary = async (payload: {
  businessName: string
  ownerName?: string
  summary: DayCloseSummaryDTO
}) => {
  const file = await buildDayClosePdfFile(payload)
  return sharePdfDocument({
    title: `${payload.businessName} day close`,
    file,
    fallbackText: buildDayCloseText(payload),
    fallbackMessage: 'PDF downloaded. Share the day-close summary from your files if this device cannot share PDF files directly.',
  })
}
