
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Percent } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// --- MOCK DATA ---
// Import mock data from the list page to ensure consistency
import { mockRateTemplates } from '../page';

interface RateComponent {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  wastage?: number; // Wastage percentage
}

interface RateTemplate {
  id:string;
  name: string;
  description: string;
  finishedUnit: string;
  components: RateComponent[];
  overheadMarkup: number;
}

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};

export default function RateTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const [template, setTemplate] = useState<RateTemplate | null>(null);

  useEffect(() => {
    const foundTemplate = mockRateTemplates.find(t => t.id === templateId);
    if (foundTemplate) {
      setTemplate(foundTemplate);
    } else {
      // router.push('/rate-templates'); // Optionally redirect if not found
    }
  }, [templateId, router]);

  if (!template) {
    return <div className="flex items-center justify-center h-full">Loading template...</div>;
  }
  
  const subTotal = template.components.reduce((acc, comp) => {
      const quantityWithWastage = comp.quantity * (1 + (comp.wastage || 0) / 100);
      return acc + (quantityWithWastage * comp.rate);
  }, 0);
  const markupAmount = subTotal * (template.overheadMarkup / 100);
  const finalRate = subTotal + markupAmount;

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Templates
      </Button>

      <Card className="shadow-lg">
         <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-3xl font-bold font-headline">{template.name}</CardTitle>
              <CardDescription className="text-lg">{template.description}</CardDescription>
            </div>
            <Button variant="outline" disabled>
              <Edit className="mr-2 h-4 w-4" /> Edit Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[250px]">Component Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Wastage (%)</TableHead>
                            <TableHead className="text-right">Rate (ZAR)</TableHead>
                            <TableHead className="text-right">Total (ZAR)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {template.components.map(comp => {
                             const quantityWithWastage = comp.quantity * (1 + (comp.wastage || 0) / 100);
                             const totalCost = quantityWithWastage * comp.rate;
                            return (
                            <TableRow key={comp.id}>
                                <TableCell className="font-medium">{comp.description}</TableCell>
                                <TableCell className="text-right">{comp.quantity.toFixed(2)}</TableCell>
                                <TableCell>{comp.unit}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{comp.wastage || 0}%</TableCell>
                                <TableCell className="text-right">{formatCurrency(comp.rate)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(totalCost)}</TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>
            <Separator className="my-6"/>
            <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-3">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sub-Total (incl. Wastage)</span>
                        <span className="font-medium">{formatCurrency(subTotal)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">Overhead & Mark-up <Percent className="h-3 w-3"/></span>
                        <span className="font-medium">{template.overheadMarkup}%</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Mark-up Amount</span>
                        <span className="font-medium">{formatCurrency(markupAmount)}</span>
                    </div>
                    <Separator/>
                     <div className="flex justify-between text-lg font-bold text-primary">
                        <span className="">Final Rate per {template.finishedUnit}</span>
                        <span className="">{formatCurrency(finalRate)}</span>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  )
}
