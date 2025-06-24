
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, ArrowRight, Calculator } from 'lucide-react';

// --- MOCK DATA ---
// In a real app, this would come from a database.
interface RateComponent {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
}

interface RateTemplate {
  id: string;
  name: string;
  description: string;
  finishedUnit: string;
  components: RateComponent[];
  overheadMarkup: number; // Stored as a percentage, e.g., 15 for 15%
}

export const mockRateTemplates: RateTemplate[] = [
  {
    id: 'template1',
    name: '220mm NFP Brickwork',
    description: 'Standard double-brick wall construction.',
    finishedUnit: 'm²',
    overheadMarkup: 15,
    components: [
      { id: 'c1', description: 'Bricks (stock 220mm)', quantity: 55, unit: 'No.', rate: 1.20 },
      { id: 'c2', description: 'Cement (42.5N)', quantity: 1.5, unit: 'kg', rate: 3.50 },
      { id: 'c3', description: 'Sand (Building)', quantity: 0.03, unit: 'm³', rate: 380 },
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
      { id: 'c5', description: 'Cement (42.5N)', quantity: 0.15, unit: 'bag', rate: 95.00 },
      { id: 'c6', description: 'Plaster Sand', quantity: 0.02, unit: 'm³', rate: 420.00 },
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
        { id: 'c8', description: 'PVA Paint', quantity: 0.25, unit: 'litre', rate: 80.00 },
        { id: 'c9', description: 'Labour (Painter)', quantity: 0.2, unit: 'hour', rate: 90.00 },
        { id: 'c10', description: 'Consumables (brushes, rollers)', quantity: 1, unit: 'allowance', rate: 5.00 },
    ]
  }
];

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};

const calculateTemplateRate = (template: RateTemplate) => {
    const subTotal = template.components.reduce((acc, comp) => acc + (comp.quantity * comp.rate), 0);
    const markupAmount = subTotal * (template.overheadMarkup / 100);
    return subTotal + markupAmount;
};

export default function RateTemplatesPage() {
  const [templates, setTemplates] = useState<RateTemplate[]>(mockRateTemplates);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center"><Calculator className="mr-3 h-8 w-8 text-primary"/>Rate Build-Up Templates</h1>
          <p className="text-muted-foreground">Define, manage, and reuse rate calculations for finished trade items.</p>
        </div>
        <Button disabled> {/* To be linked to a /new page later */}
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Search className="absolute ml-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/3"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
             <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No templates found.</p>
            </div>
          ) : (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="font-headline text-xl">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                   <CardContent className="flex-grow space-y-2">
                     <p className="text-sm font-medium">Total Components: <span className="font-normal text-muted-foreground">{template.components.length}</span></p>
                     <p className="text-sm font-medium">Markup: <span className="font-normal text-muted-foreground">{template.overheadMarkup}%</span></p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(calculateTemplateRate(template))}
                        <span className="text-sm font-normal text-muted-foreground"> / {template.finishedUnit}</span>
                    </p>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                     <Button asChild variant="outline" size="sm" className="w-full">
                         <Link href={`/rate-templates/${template.id}`}>
                            View Build-Up <ArrowRight className="ml-2 h-4 w-4"/>
                         </Link>
                     </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
