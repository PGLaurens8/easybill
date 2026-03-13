export interface MockProjectSummary {
  id: string;
  name: string;
  description: string;
  units: string[];
  status: 'Ongoing' | 'Completed' | 'Planned';
}

export interface MockClaimSummary {
  id: string;
  projectId: string;
  projectName: string;
  boqItemId: string;
  boqItemDescription: string;
  boqTotalQuantity: number;
  claimedQuantity: number;
  claimedAmount: number;
  submittedBy: string;
  submissionDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  remarks?: string;
}

export const initialProjects: MockProjectSummary[] = [
  { id: 'proj1', name: 'The Willows Estate - Phase 1', description: '45-unit luxury residential complex.', units: ['Block A', 'Block B', 'Clubhouse'], status: 'Ongoing' },
  { id: 'proj2', name: 'Riverbend Gardens', description: '70-unit secure development with modern finishes.', units: ['Phase 1', 'Phase 2', 'Gatehouse'], status: 'Planned' },
  { id: 'proj3', name: 'Acacia Heights', description: '60-unit mixed-use residential development.', units: ['Residential Block', 'Retail Section'], status: 'Ongoing' },
  { id: 'proj4', name: 'Sandton Square Offices', description: 'High-rise commercial office block.', units: ['Floors 1-5', 'Floors 6-10', 'Rooftop Venue'], status: 'Completed' },
];

export const initialClaims: MockClaimSummary[] = [
  { id: 'claim1', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'earth.2', boqItemDescription: 'Bulk excavation for foundations in normal earth', boqTotalQuantity: 2500, claimedQuantity: 2000, claimedAmount: 240000, submittedBy: 'Excavators Inc.', submissionDate: '2023-10-15', status: 'Paid', remarks: '80% complete as per site verification. Paid via EFT-001.' },
  { id: 'claim2', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'concrete.2', boqItemDescription: '25 MPa / 19mm stone concrete in strip footings', boqTotalQuantity: 300, claimedQuantity: 180, claimedAmount: 342000, submittedBy: 'Concrete Masters Ltd.', submissionDate: '2023-10-20', status: 'Approved' },
  { id: 'claim3', projectId: 'proj2', projectName: 'Riverbend Gardens', boqItemId: 'masonry.1', boqItemDescription: 'One brick thick (220mm) NFP brickwork', boqTotalQuantity: 4000, claimedQuantity: 800, claimedAmount: 224000, submittedBy: 'Masonry Pro Builders', submissionDate: '2023-11-01', status: 'Pending' },
  { id: 'claim4', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'concrete.3', boqItemDescription: 'Formwork to sides of strip footings', boqTotalQuantity: 1200, claimedQuantity: 720, claimedAmount: 108000, submittedBy: 'Shuttering Solutions', submissionDate: '2023-11-05', status: 'Rejected', remarks: 'Measurement discrepancy. Please remeasure and resubmit.' },
  { id: 'claim5', projectId: 'proj2', projectName: 'Riverbend Gardens', boqItemId: 'earth.1', boqItemDescription: 'Clear site of vegetation and topsoil', boqTotalQuantity: 5000, claimedQuantity: 5000, claimedAmount: 75000, submittedBy: 'GreenScape Landscaping', submissionDate: '2023-11-10', status: 'Paid', remarks: '100% complete. Paid via EFT-002.' },
];

const mockTradeTemplates = [
  { id: 'trade1', name: 'Preliminaries & Generals', items: [
    { id: 'prelim.1', description: 'Contractor\'s site establishment and general obligations', unit: 'Sum', quantity: 1, subcontractorRate: 150000, developerRate: 165000, progress: 100 },
    { id: 'prelim.2', description: 'Provision of statutory notices, fees, and compliance', unit: 'Sum', quantity: 1, subcontractorRate: 75000, developerRate: 82500, progress: 100 },
  ]},
  { id: 'trade2', name: 'Earthworks', items: [
    { id: 'earth.1', description: 'Clear site of vegetation and topsoil (approx. 150mm deep)', unit: 'm²', quantity: 5000, subcontractorRate: 15, developerRate: 18, progress: 100 },
    { id: 'earth.2', description: 'Bulk excavation for foundations in normal earth, not exceeding 2m deep', unit: 'm³', quantity: 2500, subcontractorRate: 120, developerRate: 135, progress: 80 },
    { id: 'earth.3', description: 'Excavate trenches for strip footings, avg 600mm wide x 900mm deep', unit: 'm', quantity: 1800, subcontractorRate: 85, developerRate: 95, progress: 60 },
  ]},
  { id: 'trade3', name: 'Concrete, Formwork & Reinforcement', items: [
    { id: 'concrete.1', description: '25 MPa / 19mm stone concrete in surface beds (100mm thick)', unit: 'm³', quantity: 450, subcontractorRate: 1850, developerRate: 2000, progress: 50 },
    { id: 'concrete.2', description: '25 MPa / 19mm stone concrete in strip footings', unit: 'm³', quantity: 300, subcontractorRate: 1900, developerRate: 2050, progress: 60 },
    { id: 'concrete.3', description: 'Formwork to sides of strip footings', unit: 'm²', quantity: 1200, subcontractorRate: 150, developerRate: 165, progress: 60 },
    { id: 'concrete.4', description: 'High tensile steel reinforcement (fy = 450 MPa)', unit: 'kg', quantity: 15000, subcontractorRate: 25, developerRate: 28, progress: 40 },
  ]},
  { id: 'trade4', name: 'Masonry', items: [
    { id: 'masonry.1', description: 'One brick thick (220mm) NFP brickwork in Class II mortar', unit: 'm²', quantity: 4000, subcontractorRate: 280, developerRate: 310, progress: 20 },
    { id: 'masonry.2', description: 'Half brick thick (110mm) NFP brickwork for internal walls', unit: 'm²', quantity: 3500, subcontractorRate: 180, developerRate: 200, progress: 10 },
  ]},
  { id: 'trade5', name: 'Finishes (Plaster, Tiling, Painting)', items: [
    { id: 'finish.1', description: 'Internal cement plaster (15mm thick) to brick walls', unit: 'm²', quantity: 8000, subcontractorRate: 95, developerRate: 110, progress: 0 },
    { id: 'finish.2', description: 'Ceramic floor tiles (600x600mm) including adhesive and grout', unit: 'm²', quantity: 3000, subcontractorRate: 220, developerRate: 250, progress: 0 },
    { id: 'finish.3', description: 'Prepare and apply three coats PVA paint to internal walls', unit: 'm²', quantity: 8000, subcontractorRate: 65, developerRate: 75, progress: 0 },
  ]},
];

export const boqData = mockTradeTemplates.flatMap(trade => trade.items);

export interface MockRateTemplateComponent {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  wastage?: number;
}

export interface MockRateTemplate {
  id: string;
  name: string;
  description: string;
  finishedUnit: string;
  components: MockRateTemplateComponent[];
  overheadMarkup: number;
}

export const mockRateTemplates: MockRateTemplate[] = [
  {
    id: 'template1',
    name: '220mm NFP Brickwork',
    description: 'Standard double-brick wall construction.',
    finishedUnit: 'm²',
    overheadMarkup: 15,
    components: [
      { id: 'c1', description: 'Bricks (stock 220mm)', quantity: 55, unit: 'No.', rate: 1.20, wastage: 10 },
      { id: 'c2', description: 'Cement (42.5N)', quantity: 1.5, unit: 'kg', rate: 3.50, wastage: 5 },
      { id: 'c3', description: 'Sand (Building)', quantity: 0.03, unit: 'm³', rate: 380, wastage: 8 },
      { id: 'c4', description: 'Labour (Bricklayer & General)', quantity: 1, unit: 'hour', rate: 60.00 },
    ],
  },
  {
    id: 'template2',
    name: 'Internal Plaster (15mm)',
    description: 'Standard internal cement plaster finish to walls.',
    finishedUnit: 'm²',
    overheadMarkup: 20,
    components: [
      { id: 'c5', description: 'Cement (42.5N)', quantity: 0.15, unit: 'bag', rate: 95.00, wastage: 5 },
      { id: 'c6', description: 'Plaster Sand', quantity: 0.02, unit: 'm³', rate: 420.00, wastage: 10 },
      { id: 'c7', description: 'Labour (Plasterer & General)', quantity: 0.75, unit: 'hour', rate: 75.00 },
    ],
  },
  {
    id: 'template3',
    name: 'Standard PVA Paint (3 Coats)',
    description: 'Standard contract-grade PVA paint, three coats.',
    finishedUnit: 'm²',
    overheadMarkup: 25,
    components: [
      { id: 'c8', description: 'PVA Paint', quantity: 0.25, unit: 'litre', rate: 80.00, wastage: 12 },
      { id: 'c9', description: 'Labour (Painter)', quantity: 0.2, unit: 'hour', rate: 90.00 },
      { id: 'c10', description: 'Consumables (brushes, rollers)', quantity: 1, unit: 'allowance', rate: 5.00, wastage: 15 },
    ],
  },
];
