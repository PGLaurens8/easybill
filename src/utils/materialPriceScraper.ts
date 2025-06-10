interface PriceData {
  supplier: string
  price: number
  unit: string
  date: string
}

class MaterialPriceScraper {
  private mockPriceData: Record<string, PriceData[]> = {
    'concrete': [
      { supplier: 'Builders Warehouse', price: 850, unit: 'm³', date: '2024-03-15' },
      { supplier: 'Mica', price: 820, unit: 'm³', date: '2024-03-15' },
      { supplier: 'Build It', price: 880, unit: 'm³', date: '2024-03-15' },
    ],
    'brick': [
      { supplier: 'Builders Warehouse', price: 3.50, unit: 'nr', date: '2024-03-15' },
      { supplier: 'Mica', price: 3.30, unit: 'nr', date: '2024-03-15' },
      { supplier: 'Build It', price: 3.40, unit: 'nr', date: '2024-03-15' },
    ],
    'steel': [
      { supplier: 'Builders Warehouse', price: 12000, unit: 'tonne', date: '2024-03-15' },
      { supplier: 'Mica', price: 11800, unit: 'tonne', date: '2024-03-15' },
      { supplier: 'Build It', price: 12100, unit: 'tonne', date: '2024-03-15' },
    ],
    'cement': [
      { supplier: 'Builders Warehouse', price: 85, unit: 'bag', date: '2024-03-15' },
      { supplier: 'Mica', price: 82, unit: 'bag', date: '2024-03-15' },
      { supplier: 'Build It', price: 84, unit: 'bag', date: '2024-03-15' },
    ],
    'sand': [
      { supplier: 'Builders Warehouse', price: 350, unit: 'm³', date: '2024-03-15' },
      { supplier: 'Mica', price: 340, unit: 'm³', date: '2024-03-15' },
      { supplier: 'Build It', price: 345, unit: 'm³', date: '2024-03-15' },
    ],
    'stone': [
      { supplier: 'Builders Warehouse', price: 450, unit: 'm³', date: '2024-03-15' },
      { supplier: 'Mica', price: 440, unit: 'm³', date: '2024-03-15' },
      { supplier: 'Build It', price: 445, unit: 'm³', date: '2024-03-15' },
    ],
    'timber': [
      { supplier: 'Builders Warehouse', price: 120, unit: 'm', date: '2024-03-15' },
      { supplier: 'Mica', price: 118, unit: 'm', date: '2024-03-15' },
      { supplier: 'Build It', price: 119, unit: 'm', date: '2024-03-15' },
    ],
    'roof sheeting': [
      { supplier: 'Builders Warehouse', price: 280, unit: 'm²', date: '2024-03-15' },
      { supplier: 'Mica', price: 275, unit: 'm²', date: '2024-03-15' },
      { supplier: 'Build It', price: 278, unit: 'm²', date: '2024-03-15' },
    ],
    'paint': [
      { supplier: 'Builders Warehouse', price: 450, unit: '5L', date: '2024-03-15' },
      { supplier: 'Mica', price: 440, unit: '5L', date: '2024-03-15' },
      { supplier: 'Build It', price: 445, unit: '5L', date: '2024-03-15' },
    ],
    'tiles': [
      { supplier: 'Builders Warehouse', price: 120, unit: 'm²', date: '2024-03-15' },
      { supplier: 'Mica', price: 118, unit: 'm²', date: '2024-03-15' },
      { supplier: 'Build It', price: 119, unit: 'm²', date: '2024-03-15' },
    ],
  }

  private findMatchingMaterial(description: string): string | null {
    const normalizedDescription = description.toLowerCase()
    for (const material of Object.keys(this.mockPriceData)) {
      if (normalizedDescription.includes(material)) {
        return material
      }
    }
    return null
  }

  async getAveragePrice(description: string): Promise<number | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const material = this.findMatchingMaterial(description)
    if (!material) {
      return null
    }

    const prices = this.mockPriceData[material]
    if (!prices || prices.length === 0) {
      return null
    }

    const averagePrice = prices.reduce((sum, data) => sum + data.price, 0) / prices.length
    return Math.round(averagePrice * 100) / 100
  }

  async getPriceHistory(description: string): Promise<PriceData[] | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const material = this.findMatchingMaterial(description)
    if (!material) {
      return null
    }

    return this.mockPriceData[material] || null
  }
}

export const materialPriceScraper = new MaterialPriceScraper() 