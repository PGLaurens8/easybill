
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, PlusCircle, Lightbulb, UploadCloud, BadgeHelp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- MOCK DATA ---
// In a real app, this would come from a database.
const mockProjects = [
  { id: 'proj1', name: 'The Willows Estate - Phase 1 (45 Units)' },
  { id: 'proj2', name: 'Riverbend Gardens - Secure Development (70 Units)' },
  { id: 'proj3', name: 'Acacia Heights - Mixed-Use Residential (60 Units)' },
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

// Combine all items into a single array for easy access
export const boqData = mockTradeTemplates.flatMap(trade => trade.items);

interface BOQItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  subcontractorRate: number;
  developerRate: number;
  progress: number; // Percentage, 0-100
}

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' }).replace(/\s/g, ''); // Remove spaces for consistency
};

export default function BoQPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleGenerateBoQ = () => {
    if (!selectedProjectId || selectedTradeIds.length === 0) {
      alert('Please select a project and at least one trade template.');
      return;
    }
    const newBoqItems: BOQItem[] = [];
    selectedTradeIds.forEach(tradeId => {
      const template = mockTradeTemplates.find(t => t.id === tradeId);
      if (template) {
        newBoqItems.push(...template.items.map(item => ({ ...item })));
      }
    });
    setBoqItems(newBoqItems);
  };
  
  const handleTradeSelection = (tradeId: string) => {
    setSelectedTradeIds(prev => 
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
  };

  const handleBoqItemChange = (itemId: string, field: keyof BOQItem, value: string | number) => {
    setBoqItems(prevItems => prevItems.map(item => 
      item.id === itemId 
        ? { ...item, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value }
        : item
    ));
  };
  
  const handleSuggestRate = (itemId: string) => {
    const item = boqItems.find(i => i.id === itemId);
    alert(`AI Rate Suggestion for: "${item?.description}".\nThis would call an AI flow and update the rate fields.`);
    const suggestedSubRate = Math.floor(Math.random() * (item?.unit === 'Sum' ? 50000 : 1500)) + 50;
    handleBoqItemChange(itemId, 'subcontractorRate', suggestedSubRate);
    handleBoqItemChange(itemId, 'developerRate', suggestedSubRate * 1.12); // Suggest dev rate with 12% margin
  };

  const filteredBoqItems = useMemo(() => {
    if (!searchTerm) return boqItems;
    return boqItems.filter(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [boqItems, searchTerm]);

  const totals = useMemo(() => {
    return filteredBoqItems.reduce((acc, item) => {
      const subbieAmount = item.quantity * item.subcontractorRate;
      const devAmount = item.quantity * item.developerRate;
      acc.subcontractorTotal += subbieAmount;
      acc.developerTotal += devAmount;
      acc.marginTotal += devAmount - subbieAmount;
      return acc;
    }, { subcontractorTotal: 0, developerTotal: 0, marginTotal: 0 });
  }, [filteredBoqItems]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">BOQ Generator</h1>
        <p className="text-muted-foreground">Generate and manage Bills of Quantities with dual rate tracking.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Setup BOQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project-select">Select Project</Label>
              <Select onValueChange={setSelectedProjectId} value={selectedProjectId || undefined}>
                <SelectTrigger id="project-select"><SelectValue placeholder="Choose a project" /></SelectTrigger>
                <SelectContent>
                  {mockProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Trade Templates</Label>
              <div className="space-y-2 border p-3 rounded-md max-h-48 overflow-y-auto">
                {mockTradeTemplates.map(template => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <Checkbox id={`trade-${template.id}`} checked={selectedTradeIds.includes(template.id)} onCheckedChange={() => handleTradeSelection(template.id)} />
                    <Label htmlFor={`trade-${template.id}`}>{template.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateBoQ} disabled={!selectedProjectId || selectedTradeIds.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" /> Generate BOQ
            </Button>
             <Button variant="outline" disabled>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload from Excel
              </Button>
          </div>
        </CardContent>
      </Card>

      {boqItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline">Generated Bill of Quantities</CardTitle>
              <Button variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" /> Export
              </Button>
            </div>
            <CardDescription>
              Project: {mockProjects.find(p => p.id === selectedProjectId)?.name || 'N/A'}
            </CardDescription>
            <Input 
              type="search" 
              placeholder="Search descriptions..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm mt-2"
            />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">No.</TableHead>
                    <TableHead className="min-w-[300px]">Description</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Sub-Rate (R)</TableHead>
                    <TableHead className="text-right">Dev-Rate (R)</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                    <TableHead className="text-right">Sub-Amount (R)</TableHead>
                    <TableHead className="text-right">Dev-Amount (R)</TableHead>
                    <TableHead className="text-right">Margin (R)</TableHead>
                    <TableHead className="min-w-[150px]">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider>
                    {filteredBoqItems.map((item, index) => {
                      const subAmount = item.quantity * item.subcontractorRate;
                      const devAmount = item.quantity * item.developerRate;
                      const margin = devAmount - subAmount;
                      return (
                        <TableRow key={`${item.id}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            <Input type="number" value={item.quantity} onChange={(e) => handleBoqItemChange(item.id, 'quantity', e.target.value)} className="w-24 h-8 text-right"/>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input type="number" value={item.subcontractorRate} onChange={(e) => handleBoqItemChange(item.id, 'subcontractorRate', e.target.value)} className="w-28 h-8 text-right"/>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input type="number" value={item.developerRate} onChange={(e) => handleBoqItemChange(item.id, 'developerRate', e.target.value)} className="w-28 h-8 text-right"/>
                          </TableCell>
                          <TableCell className="text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleSuggestRate(item.id)} title="Suggest Rate with AI">
                                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Suggest Rate with AI</p></TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(subAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(devAmount)}</TableCell>
                           <TableCell className={`text-right font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(margin)}</TableCell>
                          <TableCell>
                            <Progress value={item.progress} className="h-3" />
                            <span className="text-xs text-muted-foreground ml-2">{item.progress}%</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-end space-y-2 pt-6">
              <div className="text-right text-lg font-bold">
                  <p>Total (Subcontractor): <span className="text-red-600">{formatCurrency(totals.subcontractorTotal)}</span></p>
                  <p>Total (Developer): <span className="text-blue-600">{formatCurrency(totals.developerTotal)}</span></p>
                  <p>Total Margin: <span className="text-green-600">{formatCurrency(totals.marginTotal)}</span></p>
              </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
