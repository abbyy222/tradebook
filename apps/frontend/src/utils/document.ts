import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export const openPrintDocument = ({
  html,
  width = 960,
  height = 760,
}: {
  html: string
  width?: number
  height?: number
}) => {
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`)
  if (!printWindow) return false
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export const downloadHtmlDocument = ({
  filename,
  html,
}: {
  filename: string
  html: string
}) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

type PdfTone = 'gold' | 'green' | 'red' | 'blue' | 'neutral'

type PdfMetric = {
  label: string
  value: string
  tone?: PdfTone
}

type PdfSection = {
  title: string
  lines: string[]
}

const PDF_COLORS: Record<PdfTone, { fill: ReturnType<typeof rgb>; text: ReturnType<typeof rgb> }> = {
  gold: { fill: rgb(0.99, 0.95, 0.88), text: rgb(0.61, 0.4, 0.02) },
  green: { fill: rgb(0.9, 0.98, 0.95), text: rgb(0.18, 0.52, 0.4) },
  red: { fill: rgb(0.99, 0.93, 0.92), text: rgb(0.74, 0.27, 0.21) },
  blue: { fill: rgb(0.93, 0.95, 0.99), text: rgb(0.28, 0.34, 0.69) },
  neutral: { fill: rgb(0.97, 0.95, 0.92), text: rgb(0.2, 0.13, 0.1) },
}

const wrapPdfText = ({
  text,
  font,
  fontSize,
  maxWidth,
}: {
  text: string
  font: Awaited<ReturnType<PDFDocument['embedFont']>>
  fontSize: number
  maxWidth: number
}) => {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate
      continue
    }

    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export const buildTradebookPdf = async ({
  title,
  fileName,
  subtitleLines = [],
  badge = 'TradeBook Document',
  metrics = [],
  sections = [],
  note,
}: {
  title: string
  fileName: string
  subtitleLines?: string[]
  badge?: string
  metrics?: PdfMetric[]
  sections?: PdfSection[]
  note?: string
}) => {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89])
  const width = page.getWidth()
  const height = page.getHeight()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const colors = {
    ink: rgb(0.14, 0.08, 0.06),
    muted: rgb(0.44, 0.34, 0.28),
    border: rgb(0.89, 0.84, 0.78),
    paper: rgb(0.99, 0.98, 0.96),
    wash: rgb(0.98, 0.95, 0.91),
    accent: rgb(0.75, 0.28, 0.09),
    gold: rgb(0.91, 0.66, 0.22),
  }

  page.drawRectangle({ x: 0, y: 0, width, height, color: colors.paper })
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, color: colors.wash })
  page.drawRectangle({
    x: 28,
    y: height - 180,
    width: width - 56,
    height: 152,
    color: colors.ink,
  })
  page.drawRectangle({
    x: 28,
    y: height - 180,
    width: width - 56,
    height: 152,
    color: colors.accent,
    opacity: 0.16,
  })

  let y = height - 66

  page.drawText(title, {
    x: 48,
    y,
    font: bold,
    size: 24,
    color: rgb(1, 0.98, 0.95),
  })
  y -= 28

  for (const line of subtitleLines) {
    page.drawText(line, {
      x: 48,
      y,
      font: regular,
      size: 10,
      color: rgb(0.93, 0.9, 0.86),
    })
    y -= 14
  }

  const badgeWidth = bold.widthOfTextAtSize(badge, 10) + 22
  page.drawRectangle({
    x: 48,
    y: y - 6,
    width: badgeWidth,
    height: 22,
    color: rgb(0.97, 0.92, 0.82),
  })
  page.drawText(badge, {
    x: 59,
    y: y + 1,
    font: bold,
    size: 10,
    color: colors.gold,
  })

  y = height - 226

  if (metrics.length > 0) {
    const cardGap = 12
    const columns = metrics.length >= 4 ? 4 : metrics.length >= 2 ? 2 : 1
    const cardWidth = (width - 56 - 20 - cardGap * (columns - 1)) / columns
    const cardHeight = 72

    metrics.forEach((metric, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const cardX = 38 + column * (cardWidth + cardGap)
      const cardY = y - row * (cardHeight + 12)
      const tone = PDF_COLORS[metric.tone ?? 'neutral']

      page.drawRectangle({
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        color: tone.fill,
        borderColor: colors.border,
        borderWidth: 1,
      })
      page.drawText(metric.label.toUpperCase(), {
        x: cardX + 14,
        y: cardY + 50,
        font: bold,
        size: 8,
        color: colors.muted,
      })
      page.drawText(metric.value, {
        x: cardX + 14,
        y: cardY + 22,
        font: bold,
        size: 18,
        color: tone.text,
      })
    })

    y -= Math.ceil(metrics.length / columns) * 84 + 8
  }

  const sectionWidth = width - 76

  for (const section of sections) {
    const lineBlocks = section.lines.flatMap((line) =>
      wrapPdfText({ text: line, font: regular, fontSize: 10.5, maxWidth: sectionWidth - 28 }),
    )
    const sectionHeight = 42 + lineBlocks.length * 15 + 16

    if (y - sectionHeight < 60) break

    page.drawRectangle({
      x: 38,
      y: y - sectionHeight,
      width: sectionWidth,
      height: sectionHeight,
      color: rgb(1, 1, 1),
      borderColor: colors.border,
      borderWidth: 1,
    })
    page.drawText(section.title, {
      x: 52,
      y: y - 22,
      font: bold,
      size: 11,
      color: colors.ink,
    })

    let lineY = y - 42
    for (const line of lineBlocks) {
      page.drawText(line, {
        x: 52,
        y: lineY,
        font: regular,
        size: 10.5,
        color: colors.muted,
      })
      lineY -= 15
    }

    y -= sectionHeight + 14
  }

  if (note && y > 110) {
    const noteLines = wrapPdfText({
      text: note,
      font: regular,
      fontSize: 10.5,
      maxWidth: sectionWidth - 28,
    })
    const noteHeight = 26 + noteLines.length * 15 + 12

    page.drawRectangle({
      x: 38,
      y: y - noteHeight,
      width: sectionWidth,
      height: noteHeight,
      color: rgb(0.99, 0.95, 0.91),
      borderColor: rgb(0.93, 0.82, 0.72),
      borderWidth: 1,
    })

    let noteY = y - 22
    page.drawText('TradeBook note', {
      x: 52,
      y: noteY,
      font: bold,
      size: 10,
      color: colors.accent,
    })
    noteY -= 18

    for (const line of noteLines) {
      page.drawText(line, {
        x: 52,
        y: noteY,
        font: regular,
        size: 10.5,
        color: colors.muted,
      })
      noteY -= 15
    }
  }

  page.drawText('Generated from TradeBook', {
    x: 38,
    y: 32,
    font: regular,
    size: 9,
    color: colors.muted,
  })

  const pdfBytes = await pdf.save()
  const blobBytes = new Uint8Array(pdfBytes.length)
  blobBytes.set(pdfBytes)
  return new File([blobBytes], fileName, { type: 'application/pdf' })
}

export const downloadPdfDocument = async ({
  fileName,
  file,
}: {
  fileName?: string
  file: File
}) => {
  const blob = fileName && file.name !== fileName ? new File([await file.arrayBuffer()], fileName, { type: file.type }) : file
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = blob.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const sanitizeHtmlForPdf = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, '')

const waitForIframeReady = async (iframe: HTMLIFrameElement) => {
  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve()
  })

  const iframeWindow = iframe.contentWindow
  if (iframeWindow?.document?.fonts?.ready) {
    await iframeWindow.document.fonts.ready.catch(() => undefined)
  }

  await new Promise((resolve) => window.setTimeout(resolve, 120))
}

export const buildPdfFileFromHtml = async ({
  html,
  fileName,
  frameWidth = 1100,
  backgroundColor = '#f7f1ea',
}: {
  html: string
  fileName: string
  frameWidth?: number
  backgroundColor?: string
}) => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = `${frameWidth}px`
  iframe.style.height = '1200px'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.border = '0'

  document.body.appendChild(iframe)

  try {
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('Unable to prepare PDF document.')

    iframeDocument.open()
    iframeDocument.write(sanitizeHtmlForPdf(html))
    iframeDocument.close()

    await waitForIframeReady(iframe)

    const element = iframeDocument.body.firstElementChild as HTMLElement | null
    if (!element) throw new Error('Unable to render PDF content.')

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    })

    const pdf = new jsPDF('p', 'pt', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 22
    const contentWidth = pageWidth - margin * 2
    const scaledHeight = (canvas.height * contentWidth) / canvas.width
    const pageContentHeight = pageHeight - margin * 2

    let renderedHeight = 0
    let pageIndex = 0

    while (renderedHeight < scaledHeight - 0.5) {
      if (pageIndex > 0) pdf.addPage()

      const sourceY = Math.floor((renderedHeight / scaledHeight) * canvas.height)
      const sourceHeight = Math.min(
        canvas.height - sourceY,
        Math.ceil((pageContentHeight / scaledHeight) * canvas.height),
      )

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sourceHeight
      const pageContext = pageCanvas.getContext('2d')
      if (!pageContext) throw new Error('Unable to prepare PDF page.')

      pageContext.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        0,
        0,
        canvas.width,
        sourceHeight,
      )

      const imgData = pageCanvas.toDataURL('image/png')
      const pageSliceHeight = (sourceHeight * contentWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, pageSliceHeight, undefined, 'FAST')

      renderedHeight += pageContentHeight
      pageIndex += 1
    }

    const blob = pdf.output('blob')
    return new File([blob], fileName, { type: 'application/pdf' })
  } finally {
    iframe.remove()
  }
}

export const sharePdfDocument = async ({
  title,
  file,
  fallbackText,
  fallbackMessage,
}: {
  title: string
  file: File
  fallbackText?: string
  fallbackMessage: string
}) => {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      files: [file],
    })
    return 'shared' as const
  }

  await downloadPdfDocument({ file })
  if (fallbackText) {
    await navigator.clipboard.writeText(fallbackText)
  }
  window.alert(fallbackMessage)
  return 'downloaded' as const
}

export const shareTextOrCopy = async ({
  title,
  text,
  shareTitle,
  fallbackMessage,
}: {
  title: string
  text: string
  shareTitle?: string
  fallbackMessage: string
}) => {
  if (navigator.share) {
    await navigator.share({
      title: shareTitle ?? title,
      text,
    })
    return 'shared' as const
  }

  await navigator.clipboard.writeText(text)
  window.alert(fallbackMessage)
  return 'copied' as const
}
