interface BOQTemplate {
  id: string
  name: string
  code: string
  items: Array<{
    code: string
    description: string
    unit: string
    category: string
    notes?: string
  }>
}

export const boqTemplates: Record<string, BOQTemplate[]> = {
  residential: [
    {
      id: 'residential-preliminaries',
      name: 'Residential Preliminaries',
      code: 'PREL',
      items: [
        {
          code: 'PREL-001',
          description: 'Site establishment and security',
          unit: 'lump sum',
          category: 'preliminaries',
        },
        {
          code: 'PREL-002',
          description: 'Temporary site offices and storage',
          unit: 'lump sum',
          category: 'preliminaries',
        },
        {
          code: 'PREL-003',
          description: 'Site clearing and preparation',
          unit: 'm²',
          category: 'preliminaries',
        },
      ],
    },
    {
      id: 'residential-foundation',
      name: 'Residential Foundation',
      code: 'FOUND',
      items: [
        {
          code: 'FOUND-001',
          description: 'Excavation for foundations',
          unit: 'm³',
          category: 'earthworks',
        },
        {
          code: 'FOUND-002',
          description: 'Concrete foundations',
          unit: 'm³',
          category: 'concrete',
        },
        {
          code: 'FOUND-003',
          description: 'Waterproofing to foundations',
          unit: 'm²',
          category: 'waterproofing',
        },
      ],
    },
    {
      id: 'residential-structure',
      name: 'Residential Structure',
      code: 'STRUCT',
      items: [
        {
          code: 'STRUCT-001',
          description: 'Concrete columns and beams',
          unit: 'm³',
          category: 'concrete',
        },
        {
          code: 'STRUCT-002',
          description: 'Brickwork to external walls',
          unit: 'm²',
          category: 'masonry',
        },
        {
          code: 'STRUCT-003',
          description: 'Internal partition walls',
          unit: 'm²',
          category: 'masonry',
        },
      ],
    },
  ],
  commercial: [
    {
      id: 'commercial-preliminaries',
      name: 'Commercial Preliminaries',
      code: 'PREL',
      items: [
        {
          code: 'PREL-001',
          description: 'Site establishment and security',
          unit: 'lump sum',
          category: 'preliminaries',
        },
        {
          code: 'PREL-002',
          description: 'Temporary site offices and storage',
          unit: 'lump sum',
          category: 'preliminaries',
        },
        {
          code: 'PREL-003',
          description: 'Site clearing and preparation',
          unit: 'm²',
          category: 'preliminaries',
        },
      ],
    },
    {
      id: 'commercial-structure',
      name: 'Commercial Structure',
      code: 'STRUCT',
      items: [
        {
          code: 'STRUCT-001',
          description: 'Steel frame structure',
          unit: 'tonne',
          category: 'steel',
        },
        {
          code: 'STRUCT-002',
          description: 'Precast concrete panels',
          unit: 'm²',
          category: 'concrete',
        },
        {
          code: 'STRUCT-003',
          description: 'Structural steel connections',
          unit: 'nr',
          category: 'steel',
        },
      ],
    },
  ],
  industrial: [
    {
      id: 'industrial-preliminaries',
      name: 'Industrial Preliminaries',
      code: 'PREL',
      items: [
        {
          code: 'PREL-001',
          description: 'Site establishment and security',
          unit: 'lump sum',
          category: 'preliminaries',
        },
        {
          code: 'PREL-002',
          description: 'Temporary site offices and storage',
          unit: 'lump sum',
          category: 'preliminaries',
        },
        {
          code: 'PREL-003',
          description: 'Site clearing and preparation',
          unit: 'm²',
          category: 'preliminaries',
        },
      ],
    },
    {
      id: 'industrial-structure',
      name: 'Industrial Structure',
      code: 'STRUCT',
      items: [
        {
          code: 'STRUCT-001',
          description: 'Steel portal frame',
          unit: 'tonne',
          category: 'steel',
        },
        {
          code: 'STRUCT-002',
          description: 'Precast concrete floor slabs',
          unit: 'm²',
          category: 'concrete',
        },
        {
          code: 'STRUCT-003',
          description: 'Steel roof trusses',
          unit: 'tonne',
          category: 'steel',
        },
      ],
    },
  ],
}

export const commonTrades = [
  {
    id: 'preliminaries',
    name: 'Preliminaries',
    code: 'PREL',
    items: [
      {
        code: 'PREL-001',
        description: 'Site establishment and security',
        unit: 'lump sum',
        category: 'preliminaries',
      },
      {
        code: 'PREL-002',
        description: 'Temporary site offices and storage',
        unit: 'lump sum',
        category: 'preliminaries',
      },
      {
        code: 'PREL-003',
        description: 'Site clearing and preparation',
        unit: 'm²',
        category: 'preliminaries',
      },
    ],
  },
  {
    id: 'demolition',
    name: 'Demolition',
    code: 'DEMO',
    items: [
      {
        code: 'DEMO-001',
        description: 'Demolition of existing structures',
        unit: 'm²',
        category: 'demolition',
      },
      {
        code: 'DEMO-002',
        description: 'Removal of debris',
        unit: 'm³',
        category: 'demolition',
      },
    ],
  },
  {
    id: 'excavation',
    name: 'Excavation',
    code: 'EXCA',
    items: [
      {
        code: 'EXCA-001',
        description: 'Bulk excavation',
        unit: 'm³',
        category: 'earthworks',
      },
      {
        code: 'EXCA-002',
        description: 'Trench excavation',
        unit: 'm',
        category: 'earthworks',
      },
    ],
  },
  {
    id: 'concrete',
    name: 'Concrete',
    code: 'CONC',
    items: [
      {
        code: 'CONC-001',
        description: 'Concrete foundations',
        unit: 'm³',
        category: 'concrete',
      },
      {
        code: 'CONC-002',
        description: 'Concrete columns',
        unit: 'm³',
        category: 'concrete',
      },
      {
        code: 'CONC-003',
        description: 'Concrete beams',
        unit: 'm³',
        category: 'concrete',
      },
    ],
  },
  {
    id: 'masonry',
    name: 'Masonry',
    code: 'MASO',
    items: [
      {
        code: 'MASO-001',
        description: 'Brickwork to external walls',
        unit: 'm²',
        category: 'masonry',
      },
      {
        code: 'MASO-002',
        description: 'Internal partition walls',
        unit: 'm²',
        category: 'masonry',
      },
    ],
  },
  {
    id: 'steel',
    name: 'Steel',
    code: 'STEL',
    items: [
      {
        code: 'STEL-001',
        description: 'Structural steel frame',
        unit: 'tonne',
        category: 'steel',
      },
      {
        code: 'STEL-002',
        description: 'Steel connections',
        unit: 'nr',
        category: 'steel',
      },
    ],
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    code: 'CARP',
    items: [
      {
        code: 'CARP-001',
        description: 'Roof trusses',
        unit: 'nr',
        category: 'carpentry',
      },
      {
        code: 'CARP-002',
        description: 'Roof battens',
        unit: 'm²',
        category: 'carpentry',
      },
    ],
  },
  {
    id: 'roofing',
    name: 'Roofing',
    code: 'ROOF',
    items: [
      {
        code: 'ROOF-001',
        description: 'Roof sheeting',
        unit: 'm²',
        category: 'roofing',
      },
      {
        code: 'ROOF-002',
        description: 'Roof insulation',
        unit: 'm²',
        category: 'roofing',
      },
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    code: 'PLUM',
    items: [
      {
        code: 'PLUM-001',
        description: 'Water supply pipes',
        unit: 'm',
        category: 'plumbing',
      },
      {
        code: 'PLUM-002',
        description: 'Drainage pipes',
        unit: 'm',
        category: 'plumbing',
      },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical',
    code: 'ELEC',
    items: [
      {
        code: 'ELEC-001',
        description: 'Electrical conduits',
        unit: 'm',
        category: 'electrical',
      },
      {
        code: 'ELEC-002',
        description: 'Electrical cables',
        unit: 'm',
        category: 'electrical',
      },
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC',
    code: 'HVAC',
    items: [
      {
        code: 'HVAC-001',
        description: 'Air conditioning units',
        unit: 'nr',
        category: 'hvac',
      },
      {
        code: 'HVAC-002',
        description: 'Ductwork',
        unit: 'm',
        category: 'hvac',
      },
    ],
  },
  {
    id: 'finishes',
    name: 'Finishes',
    code: 'FINS',
    items: [
      {
        code: 'FINS-001',
        description: 'Internal plastering',
        unit: 'm²',
        category: 'finishes',
      },
      {
        code: 'FINS-002',
        description: 'Floor screed',
        unit: 'm²',
        category: 'finishes',
      },
    ],
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    code: 'LAND',
    items: [
      {
        code: 'LAND-001',
        description: 'Topsoil',
        unit: 'm³',
        category: 'landscaping',
      },
      {
        code: 'LAND-002',
        description: 'Turf',
        unit: 'm²',
        category: 'landscaping',
      },
    ],
  },
] 