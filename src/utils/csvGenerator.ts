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

export class CSVGenerator {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private generateUnitCSV(unit: Unit): string {
    const rows: string[] = []

    // Add unit details
    rows.push('Unit Details')
    rows.push(`Name,${this.escapeCSV(unit.name)}`)
    rows.push(`Type,${this.escapeCSV(unit.type)}`)
    rows.push(`Area,${unit.area} m²`)
    rows.push('')

    // Add BOQ items
    rows.push('BOQ Items')
    rows.push('Code,Description,Unit,Quantity,Unit Rate,Amount,Trade,Category,Notes')
    unit.boqItems.forEach((item) => {
      rows.push(
        [
          this.escapeCSV(item.code),
          this.escapeCSV(item.description),
          this.escapeCSV(item.unit),
          item.quantity,
          this.formatCurrency(item.unitRate),
          this.formatCurrency(item.amount),
          this.escapeCSV(item.trade),
          this.escapeCSV(item.category),
          this.escapeCSV(item.notes || ''),
        ].join(',')
      )
    })

    return rows.join('\n')
  }

  private generateSummaryCSV(units: Unit[], trades: Trade[]): string {
    const rows: string[] = []

    // Add trade totals
    rows.push('Total Cost by Trade')
    rows.push('Trade,Amount')
    trades.forEach((trade) => {
      const tradeTotal = units.reduce((sum, unit) => {
        const tradeItems = unit.boqItems.filter((item) => item.trade === trade.code)
        return sum + tradeItems.reduce((itemSum, item) => itemSum + item.amount, 0)
      }, 0)
      rows.push(`${this.escapeCSV(trade.name)},${this.formatCurrency(tradeTotal)}`)
    })

    rows.push('')

    // Add unit totals
    rows.push('Total Cost by Unit')
    rows.push('Unit,Amount')
    units.forEach((unit) => {
      const unitTotal = unit.boqItems.reduce((sum, item) => sum + item.amount, 0)
      rows.push(`${this.escapeCSV(unit.name)},${this.formatCurrency(unitTotal)}`)
    })

    return rows.join('\n')
  }

  generateCSV(units: Unit[], trades: Trade[]): void {
    const csvContent = [
      this.generateSummaryCSV(units, trades),
      '',
      ...units.map((unit) => this.generateUnitCSV(unit)),
    ].join('\n')

    // Create a blob and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'BOQ.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export const csvGenerator = new CSVGenerator() 