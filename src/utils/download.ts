export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvValue(value: string) {
  // Text starting with = + - @ (or tab/CR) is run as a formula by Excel. Claims carry text typed by
  // other companies, so neutralise it; plain numbers such as -12.5 are left alone.
  const guarded = /^[=+\-@\t\r]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value) ? `'${value}` : value
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

export function toCsv(rows: Array<Array<string | number>>): string {
  return rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(',')).join('\n')
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  // Leading BOM so Excel opens UTF-8 (e.g. m², R) correctly.
  downloadTextFile(filename, '﻿' + toCsv(rows), 'text/csv;charset=utf-8;')
}

export function escapeHtml(value: string) {
  return value
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;')
}

/**
 * Print an HTML document through a hidden iframe. Unlike window.open this is not caught by
 * popup blockers and keeps the user on the page.
 */
export function printHtmlDocument(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)

  const frameWindow = frame.contentWindow
  if (!frameWindow) {
    document.body.removeChild(frame)
    throw new Error('Printing is not available in this browser.')
  }

  frameWindow.document.open()
  frameWindow.document.write(html)
  frameWindow.document.close()

  const cleanup = () => {
    if (frame.parentNode) {
      frame.parentNode.removeChild(frame)
    }
  }
  frameWindow.addEventListener('afterprint', cleanup)
  window.setTimeout(cleanup, 60_000)

  frameWindow.focus()
  frameWindow.print()
}
