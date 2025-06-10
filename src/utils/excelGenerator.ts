import * as XLSX from 'xlsx'

interface BOQItem {
  id: string
  code: string
  description: string
  unit: string
  quantity: number
  unitRate: number
  amount: number
  trade: string
  category: string
  notes?: string
}

interface Unit {
  id: string
  name: string
  type: string
  area: number
  boqItems: BOQItem[]
}

interface Trade {
  id: string
  name: string
  code: string
}

export class ExcelGenerator {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  private generateUnitSheet(unit: Unit): XLSX.WorkSheet {
    const data = [
      ['Unit Details'],
      ['Name', unit.name],
      ['Type', unit.type],
      ['Area', `${unit.area} m²`],
      [],
      ['BOQ Items'],
      ['Code', 'Description', 'Unit', 'Quantity', 'Unit Rate', 'Amount', 'Trade', 'Category', 'Notes'],
    ]

    unit.boqItems.forEach((item) => {
      data.push([
        item.code,
        item.description,
        item.unit,
        item.quantity.toString(),
        this.formatCurrency(item.unitRate),
        this.formatCurrency(item.amount),
        item.trade,
        item.category,
        item.notes || '',
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)

    // Style the header
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
    }

    // Apply styles to the header rows
    for (let i = 0; i < 4; i++) {
      ws[`A${i + 1}`].s = headerStyle
      ws[`B${i + 1}`].s = headerStyle
    }

    // Apply styles to the BOQ items header
    for (let i = 0; i < 9; i++) {
      const cell = XLSX.utils.encode_cell({ r: 5, c: i })
      ws[cell].s = headerStyle
    }

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Code
      { wch: 40 }, // Description
      { wch: 10 }, // Unit
      { wch: 12 }, // Quantity
      { wch: 15 }, // Unit Rate
      { wch: 15 }, // Amount
      { wch: 15 }, // Trade
      { wch: 15 }, // Category
      { wch: 30 }, // Notes
    ]
    ws['!cols'] = colWidths

    return ws
  }

  private generateSummarySheet(units: Unit[], trades: Trade[]): XLSX.WorkSheet {
    const data = [
      ['BOQ Summary'],
      [],
      ['Total Cost by Trade'],
      ['Trade', 'Amount'],
    ]

    // Add trade totals
    trades.forEach((trade) => {
      const tradeTotal = units.reduce((sum, unit) => {
        const tradeItems = unit.boqItems.filter((item) => item.trade === trade.code)
        return sum + tradeItems.reduce((itemSum, item) => itemSum + item.amount, 0)
      }, 0)
      data.push([trade.name, this.formatCurrency(tradeTotal)])
    })

    data.push([])
    data.push(['Total Cost by Unit'])
    data.push(['Unit', 'Amount'])

    // Add unit totals
    units.forEach((unit) => {
      const unitTotal = unit.boqItems.reduce((sum, item) => sum + item.amount, 0)
      data.push([unit.name, this.formatCurrency(unitTotal)])
    })

    const ws = XLSX.utils.aoa_to_sheet(data)

    // Style the headers
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
    }

    // Apply styles to the main header
    ws['A1'].s = headerStyle
    ws['B1'].s = headerStyle

    // Apply styles to the trade totals header
    ws['A3'].s = headerStyle
    ws['B3'].s = headerStyle

    // Apply styles to the unit totals header
    ws['A7'].s = headerStyle
    ws['B7'].s = headerStyle

    // Set column widths
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }]

    return ws
  }

  generateExcel(units: Unit[], trades: Trade[]): void {
    const wb = XLSX.utils.book_new()

    // Add summary sheet
    const summarySheet = this.generateSummarySheet(units, trades)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

    // Add unit sheets
    units.forEach((unit) => {
      const unitSheet = this.generateUnitSheet(unit)
      XLSX.utils.book_append_sheet(wb, unitSheet, unit.name)
    })

    // Save the file
    XLSX.writeFile(wb, 'BOQ.xlsx')
  }
}

export const excelGenerator = new ExcelGenerator() 