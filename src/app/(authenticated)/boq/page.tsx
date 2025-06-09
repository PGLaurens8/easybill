
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileDown, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Mock data updated for South African context
const mockProjects = [
  { id: 'proj1', name: 'The Willows Estate - Phase 1 (45 Units)' },
  { id: 'proj2', name: 'Riverbend Gardens - Secure Development (70 Units)' },
  { id: 'proj3', name: 'Acacia Heights - Mixed-Use Residential (60 Units)' },
];

const mockTradeTemplates = [
  { id: 'trade1', name: 'Preliminaries & Generals', items: [
    { id: 'prelim.1', description: 'Contractor\'s site establishment and general obligations', unit: 'Sum', quantity: 0, rate: 0, amount: 0 },
    { id: 'prelim.2', description: 'Provision of statutory notices, fees, and compliance', unit: 'Sum', quantity: 0, rate: 0, amount: 0 },
    { id: 'prelim.3', description: 'Site safety, health, and environmental (SHE) management plan', unit: 'Sum', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade2', name: 'Earthworks', items: [
    { id: 'earth.1', description: 'Clear site of vegetation and topsoil (approx. 150mm deep) and stockpile', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'earth.2', description: 'Bulk excavation for foundations in normal earth, not exceeding 2m deep', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'earth.3', description: 'Excavate trenches for strip footings, average 600mm wide x 900mm deep', unit: 'm', quantity: 0, rate: 0, amount: 0 },
    { id: 'earth.4', description: 'Backfill around foundations with approved material, compacted in layers', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'earth.5', description: 'Cart away surplus excavated material from site', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade3', name: 'Concrete, Formwork & Reinforcement', items: [
    { id: 'concrete.1', description: '25 MPa / 19mm stone concrete in surface beds (100mm thick)', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'concrete.2', description: '25 MPa / 19mm stone concrete in strip footings', unit: 'cum', quantity: 0, rate: 0, amount: 0 },
    { id: 'concrete.3', description: 'Formwork to sides of strip footings', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'concrete.4', description: 'High tensile steel reinforcement (fy = 450 MPa) - various diameters, cut, bend and place', unit: 'kg', quantity: 0, rate: 0, amount: 0 },
    { id: 'concrete.5', description: 'Fabric reinforcement (Ref 193 or similar) in surface beds', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade4', name: 'Masonry', items: [
    { id: 'masonry.1', description: 'One brick thick (220mm) NFP (Non-Facing Plastered) brickwork in Class II mortar', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'masonry.2', description: 'Half brick thick (110mm) NFP brickwork in Class II mortar for internal non-loadbearing walls', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'masonry.3', description: '220mm wide DPC (Damp Proof Course) to walls', unit: 'm', quantity: 0, rate: 0, amount: 0 },
    { id: 'masonry.4', description: 'Brickforce reinforcement in masonry every third course', unit: 'm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade5', name: 'Roof Construction (Timber Trusses & Concrete Tiles)', items: [
    { id: 'roof.1', description: 'Supply and erect prefabricated timber roof trusses (engineer designed)', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'roof.2', description: 'Under-tile membrane (SANS 1381-4 compliant)', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'roof.3', description: 'Concrete roof tiles (e.g. Marley Modern or similar) including ridging and hip tiles', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'roof.4', description: '22mm x 150mm SA Pine fascia boards, painted', unit: 'm', quantity: 0, rate: 0, amount: 0 },
    { id: 'roof.5', description: '114mm PVC gutters including outlets and stop ends', unit: 'm', quantity: 0, rate: 0, amount: 0 },
    { id: 'roof.6', description: '80mm diameter PVC downpipes including bends and shoes', unit: 'm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade6', name: 'Plastering, Tiling & Painting (Finishes)', items: [
    { id: 'finish.1', description: 'Internal cement plaster (15mm thick) to brick walls', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'finish.2', description: 'External cement plaster (20mm thick) to brick walls, weatherproof finish', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'finish.3', description: 'Ceramic floor tiles (600x600mm) including adhesive and grout, on screed', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'finish.4', description: 'Ceramic wall tiles (300x600mm) to bathroom (2.1m high) and kitchen splashbacks', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'finish.5', description: 'Prepare and apply three coats PVA paint to internal plastered walls', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
    { id: 'finish.6', description: 'Prepare and apply three coats acrylic paint to external plastered walls', unit: 'sqm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade7', name: 'Plumbing & Drainage', items: [
    { id: 'plumb.1', description: 'Supply and install close-coupled WC suite (dual flush) complete with seat and cistern', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'plumb.2', description: 'Supply and install vanity wash hand basin (500mm) with mixer tap and waste', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'plumb.3', description: 'Supply and install built-in acrylic bath (1700x700mm) with mixer and waste', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'plumb.4', description: 'Supply and install stainless steel double bowl kitchen sink with mixer and waste', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'plumb.5', description: '150 Litre high-pressure solar geyser installation (SANS compliant)', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'plumb.6', description: 'Copper piping (15mm & 22mm) for hot and cold water reticulation', unit: 'm', quantity: 0, rate: 0, amount: 0 },
    { id: 'plumb.7', description: '110mm uPVC soil and waste drainage pipes including fittings and rodding eyes', unit: 'm', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade8', name: 'Electrical Installation', items: [
    { id: 'elec.1', description: 'Supply and install distribution board (DB) with circuit breakers and earth leakage (SANS 10142 compliant)', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'elec.2', description: 'Light point wired in conduit, including standard batten holder fitting', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'elec.3', description: 'Single switched socket outlet (16A)', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'elec.4', description: 'Double switched socket outlet (16A)', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'elec.5', description: 'Stove connection point (30A isolator)', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'elec.6', description: 'Geyser connection point with isolator', unit: 'No', quantity: 0, rate: 0, amount: 0 },
  ]},
  { id: 'trade9', name: 'Doors, Windows & Joinery', items: [
    { id: 'join.1', description: 'Standard size aluminium windows (e.g., PT1212) with single glazing, supply and install', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'join.2', description: 'Exterior grade solid core door (813x2032mm) in timber frame, including ironmongery, painted', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'join.3', description: 'Interior hollow core door (813x2032mm) in timber frame, including ironmongery, painted', unit: 'No', quantity: 0, rate: 0, amount: 0 },
    { id: 'join.4', description: 'Kitchen cupboards - base and wall units, standard melamine finish', unit: 'Sum', quantity: 0, rate: 0, amount: 0 },
    { id: 'join.5', description: 'Bedroom built-in cupboards - standard melamine finish', unit: 'm', quantity: 0, rate: 0, amount: 0 }, // Often measured per linear meter of frontage
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
  const [randomNumberKey, setRandomNumberKey] = useState(0); // Used to trigger re-generation of random data

  useEffect(() => {
    // This effect runs only on the client after hydration
    // It's used here to ensure Math.random isn't causing hydration mismatches
    // if handleGenerateBoQ was called on initial render with random values.
    // However, handleGenerateBoQ is user-triggered, so this might be overly cautious
    // unless we pre-generate on load, which we are not currently.
  }, []);

  const handleGenerateBoQ = () => {
    if (!selectedProjectId || selectedTradeIds.length === 0) {
      alert('Please select a project and at least one trade template.');
      return;
    }
    const newBoqItems: BOQItem[] = [];
    selectedTradeIds.forEach(tradeId => {
      const template = mockTradeTemplates.find(t => t.id === tradeId);
      if (template) {
        // Use a client-side only random generation strategy
        newBoqItems.push(...template.items.map(item => ({ 
            ...item, 
            quantity: Math.floor(Math.random() * 500) + 50, // Example: 50 to 550 units
            rate: Math.floor(Math.random() * (item.unit === 'Sum' ? 50000 : 1500)) + (item.unit === 'Sum' ? 10000 : 50) // Example: R50-R1550 or R10k-R60k for Sum
        })));
      }
    });
    // Calculate initial amounts
    const itemsWithAmounts = newBoqItems.map(item => ({...item, amount: item.quantity * item.rate }));
    setBoqItems(itemsWithAmounts);
    setRandomNumberKey(prev => prev + 1); // Force re-render if needed for other random elements, though not strictly here
  };
  
  const handleTradeSelection = (tradeId: string) => {
    setSelectedTradeIds(prev => 
      prev.includes(tradeId) ? prev.filter(id => id !== tradeId) : [...prev, tradeId]
    );
  };

  const handleBoqItemChange = (itemId: string, field: keyof BOQItem, value: string | number) => {
    setBoqItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const newItem = { ...item, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value };
        // Ensure quantity and rate are numbers before multiplication
        const q = typeof newItem.quantity === 'number' ? newItem.quantity : 0;
        const r = typeof newItem.rate === 'number' ? newItem.rate : 0;
        newItem.amount = q * r;
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
        <p className="text-muted-foreground">Generate Bills of Quantities for your projects (South African Context).</p>
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
                    <TableHead className="min-w-[400px]">Description</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate (R)</TableHead>
                    <TableHead className="text-right">Amount (R)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boqItems.map((item, index) => (
                    <TableRow key={`${item.id}-${index}`}> {/* Ensure unique key if items can be duplicated across trades */}
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleBoqItemChange(item.id, 'quantity', e.target.value)}
                          className="w-24 h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input 
                          type="number" 
                          value={item.rate} 
                          onChange={(e) => handleBoqItemChange(item.id, 'rate', e.target.value)}
                          className="w-28 h-8 text-right"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-right">{(item.quantity * item.rate).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' }).replace('ZAR', '')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 text-right">
              <p className="text-xl font-bold">Total Amount: <span className="text-primary">{totalAmount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })}</span></p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
