
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Added import for Input

// Mock data
const mockProjects = [
  { id: '1', name: 'Skyline Towers Residential Complex' },
  { id: '2', name: 'Greenfield Shopping Mall' },
  { id: '3', name: 'Oceanview Corporate Park' },
];

const mockTradeTemplates = [
  { id: 'trade1', name: 'Excavation & Earthwork', items: [
    { id: 'item1.1', description: 'Site Clearance including removal of shrubs and debris', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'item1.2', description: 'Bulk Excavation for foundations (up to 2m depth)', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'item1.3', description: 'Backfilling with approved material around foundations', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade2', name: 'Concrete Works', items: [
    { id: 'item2.1', description: 'Plain Cement Concrete (PCC) 1:4:8 in foundation blinding', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'item2.2', description: 'Reinforced Cement Concrete (RCC) - M25 for Slabs', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'item2.3', description: 'Formwork for RCC Columns (plywood finish)', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade3', name: 'Masonry Works', items: [
    { id: 'item3.1', description: 'Brickwork in Cement Mortar 1:6 (230mm thick walls)', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'item3.2', description: 'Internal Plastering (12mm thick) in CM 1:4', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade4', name: 'Plumbing & Sanitary Works', items: [
    { id: 'item4.1', description: 'Supply and installation of UPVC pipes for drainage (110mm dia)', unit: 'm', quantity: 0, rate: 0, amount: 0 },
    { id: 'item4.2', description: 'Installation of standard white ceramic wash basin with pedestal', unit: 'nos', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade5', name: 'Finishing Works', items: [
    { id: 'item5.1', description: 'Two coats of acrylic emulsion paint on internal walls', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'item5.2', description: 'Vitrified tile flooring (600x600mm) in rooms', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
  ]},
];

interface BOQItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function BoQPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);

  const handleGenerateBoQ = () => {
    if (!selectedProjectId || selectedTradeIds.length === 0) {
      alert('Please select a project and at least one trade template.');
      return;
    }
    const newBoqItems: BOQItem[] = [];
    selectedTradeIds.forEach(tradeId => {
      const template = mockTradeTemplates.find(t => t.id === tradeId);
      if (template) {
        newBoqItems.push(...template.items.map(item => ({ ...item, quantity: Math.floor(Math.random() * 500) + 50, rate: Math.floor(Math.random() * 200) + 20 }))); // Pre-fill with random data
      }
    });
    // Calculate initial amounts
    const itemsWithAmounts = newBoqItems.map(item => ({...item, amount: item.quantity * item.rate }));
    setBoqItems(itemsWithAmounts);
  };
  
  const handleTradeSelection = (tradeId: string) => {
    setSelectedTradeIds(prev => 
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
  };

  const handleBoqItemChange = (itemId: string, field: keyof BOQItem, value: string | number) => {
    setBoqItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const newItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          newItem.amount = newItem.quantity * newItem.rate;
        }
        return newItem;
      }
      return item;
    }));
  };

  const totalAmount = boqItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">BOQ Generator</h1>
        <p className="text-muted-foreground">Generate Bills of Quantities for your projects.</p>
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
                <SelectTrigger id="project-select">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
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
                    <Checkbox
                      id={`trade-${template.id}`}
                      checked={selectedTradeIds.includes(template.id)}
                      onCheckedChange={() => handleTradeSelection(template.id)}
                    />
                    <Label htmlFor={`trade-${template.id}`}>{template.name}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleGenerateBoQ} disabled={!selectedProjectId || selectedTradeIds.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Generate BOQ
          </Button>
        </CardContent>
      </Card>

      {boqItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-headline">Generated Bill of Quantities</CardTitle>
              <Button variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" /> Export as PDF/CSV
              </Button>
            </div>
            <CardDescription>
              Project: {mockProjects.find(p => p.id === selectedProjectId)?.name || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead className="min-w-[300px]">Description</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boqItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleBoqItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-24 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={item.rate} 
                          onChange={(e) => handleBoqItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-24 h-8"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{(item.quantity * item.rate).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-right">
              <p className="text-lg font-bold">Total Amount: <span className="text-primary">{totalAmount.toFixed(2)}</span></p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    