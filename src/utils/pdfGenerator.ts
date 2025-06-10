import jsPDF from 'jspdf'
import 'jspdf-autotable'

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

export class PDFGenerator {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  private addUnitPage(doc: jsPDF, unit: Unit, pageNumber: number, totalPages: number) {
    // Add unit details
    doc.setFontSize(16)
    doc.text(unit.name, 14, 20)
    doc.setFontSize(12)
    doc.text(`Type: ${unit.type}`, 14, 30)
    doc.text(`Area: ${unit.area} m²`, 14, 40)

    // Add BOQ items table
    const tableData = unit.boqItems.map((item) => [
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

    ;(doc as any).autoTable({
      startY: 50,
      head: [['Code', 'Description', 'Unit', 'Quantity', 'Unit Rate', 'Amount', 'Trade', 'Category', 'Notes']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
    })

    // Add page number
    doc.setFontSize(10)
    doc.text(`Page ${pageNumber} of ${totalPages}`, 14, doc.internal.pageSize.height - 10)
  }

  private addSummaryPage(doc: jsPDF, units: Unit[], trades: Trade[]) {
    // Add title
    doc.setFontSize(20)
    doc.text('BOQ Summary', 14, 20)

    // Add trade totals
    doc.setFontSize(14)
    doc.text('Total Cost by Trade', 14, 40)

    const tradeData = trades.map((trade) => {
      const tradeTotal = units.reduce((sum, unit) => {
        const tradeItems = unit.boqItems.filter((item) => item.trade === trade.code)
        return sum + tradeItems.reduce((itemSum, item) => itemSum + item.amount, 0)
      }, 0)
      return [trade.name, this.formatCurrency(tradeTotal)]
    })

    ;(doc as any).autoTable({
      startY: 50,
      head: [['Trade', 'Amount']],
      body: tradeData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
    })

    // Add unit totals
    doc.setFontSize(14)
    doc.text('Total Cost by Unit', 14, (doc as any).lastAutoTable.finalY + 20)

    const unitData = units.map((unit) => {
      const unitTotal = unit.boqItems.reduce((sum, item) => sum + item.amount, 0)
      return [unit.name, this.formatCurrency(unitTotal)]
    })

    ;(doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 30,
      head: [['Unit', 'Amount']],
      body: unitData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
    })
  }

  generatePDF(units: Unit[], trades: Trade[]): void {
    const doc = new jsPDF()

    // Add summary page
    this.addSummaryPage(doc, units, trades)

    // Add unit pages
    units.forEach((unit, index) => {
      if (index > 0) {
        doc.addPage()
      }
      this.addUnitPage(doc, unit, index + 2, units.length + 1)
    })

    // Save the file
    doc.save('BOQ.pdf')
  }
}

export const pdfGenerator = new PDFGenerator() 