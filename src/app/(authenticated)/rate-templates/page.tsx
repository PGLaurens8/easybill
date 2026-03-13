
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, ArrowRight, Calculator } from 'lucide-react';
import { mockRateTemplates } from '@/lib/mock-data';

// --- MOCK DATA ---
// In a real app, this would come from a database.
interface RateComponent {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  wastage?: number; // Wastage percentage, e.g., 10 for 10%
}

interface RateTemplate {
  id: string;
  name: string;
  description: string;
  finishedUnit: string;
  components: RateComponent[];
  overheadMarkup: number; // Stored as a percentage, e.g., 15 for 15%
}

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};

const calculateTemplateRate = (template: RateTemplate) => {
    const subTotal = template.components.reduce((acc, comp) => {
        const quantityWithWastage = comp.quantity * (1 + (comp.wastage || 0) / 100);
        return acc + (quantityWithWastage * comp.rate);
    }, 0);
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
