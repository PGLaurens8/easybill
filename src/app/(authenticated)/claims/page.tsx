
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, Search, UploadCloud, AlertTriangle, DollarSign, FileCheck2, HandCoins } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { boqData } from '../boq/page'; // Import BOQ data for financial calculations

// --- MOCK DATA ---
interface Claim {
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

export const initialClaims: Claim[] = [
  { id: 'claim1', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'earth.2', boqItemDescription: 'Bulk excavation for foundations in normal earth', boqTotalQuantity: 2500, claimedQuantity: 2000, claimedAmount: 240000, submittedBy: 'Excavators Inc.', submissionDate: '2023-10-15', status: 'Paid', remarks: '80% complete as per site verification. Paid via EFT-001.' },
  { id: 'claim2', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'concrete.2', boqItemDescription: '25 MPa / 19mm stone concrete in strip footings', boqTotalQuantity: 300, claimedQuantity: 180, claimedAmount: 342000, submittedBy: 'Concrete Masters Ltd.', submissionDate: '2023-10-20', status: 'Approved' },
  { id: 'claim3', projectId: 'proj2', projectName: 'Riverbend Gardens', boqItemId: 'masonry.1', boqItemDescription: 'One brick thick (220mm) NFP brickwork', boqTotalQuantity: 4000, claimedQuantity: 800, claimedAmount: 224000, submittedBy: 'Masonry Pro Builders', submissionDate: '2023-11-01', status: 'Pending' },
  { id: 'claim4', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'concrete.3', boqItemDescription: 'Formwork to sides of strip footings', boqTotalQuantity: 1200, claimedQuantity: 720, claimedAmount: 108000, submittedBy: 'Shuttering Solutions', submissionDate: '2023-11-05', status: 'Rejected', remarks: 'Measurement discrepancy. Please remeasure and resubmit.' },
  { id: 'claim5', projectId: 'proj2', projectName: 'Riverbend Gardens', boqItemId: 'earth.1', boqItemDescription: 'Clear site of vegetation and topsoil', boqTotalQuantity: 5000, claimedQuantity: 5000, claimedAmount: 75000, submittedBy: 'GreenScape Landscaping', submissionDate: '2023-11-10', status: 'Paid', remarks: '100% complete. Paid via EFT-002.' },
];

const mockProjects = [
  { id: 'proj1', name: 'The Willows Estate - Phase 1 (45 Units)', boqItems: [ {id: 'earth.1', description: 'Clear site of vegetation...', totalQty: 5000, subRate: 15}, {id: 'earth.2', description: 'Bulk excavation for foundations...', totalQty: 2500, subRate: 120}, {id: 'concrete.2', description: '25 MPa concrete in strip footings', totalQty: 300, subRate: 1900}, {id: 'concrete.3', description: 'Formwork to sides of strip footings', totalQty: 1200, subRate: 150} ]},
  { id: 'proj2', name: 'Riverbend Gardens - Secure Development (70 Units)', boqItems: [ {id: 'earth.1', description: 'Clear site of vegetation...', totalQty: 5000, subRate: 15}, {id: 'masonry.1', description: 'One brick thick (220mm) NFP brickwork', totalQty: 4000, subRate: 280} ]},
  { id: 'proj3', name: 'Acacia Heights - Mixed-Use Residential (60 Units)', boqItems: [ {id: 'finish.1', description: 'Internal cement plaster (15mm thick)', totalQty: 8000, subRate: 95} ]}
];

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};

const FinancialSummary = ({ claims, projectId }: { claims: Claim[], projectId: string | null }) => {
    const summary = useMemo(() => {
        if (!projectId) return null;

        const projectBoqItems = boqData.filter(item => {
            // A real app would have a projectId on each BOQ item.
            // For mock, we'll assume all BOQ items can belong to any project for calculation demo.
            return true; 
        });

        const totalContractValue = projectBoqItems.reduce((acc, item) => acc + (item.quantity * item.subcontractorRate), 0);
        
        const projectClaims = claims.filter(c => c.projectId === projectId);
        const totalApproved = projectClaims
            .filter(c => c.status === 'Approved' || c.status === 'Paid')
            .reduce((acc, c) => acc + c.claimedAmount, 0);

        const totalPaid = projectClaims
            .filter(c => c.status === 'Paid')
            .reduce((acc, c) => acc + c.claimedAmount, 0);

        const balanceToPay = totalApproved - totalPaid;

        return { totalContractValue, totalApproved, totalPaid, balanceToPay };

    }, [claims, projectId]);

    if (!summary) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Project Financial Snapshot</CardTitle>
                <CardDescription>
                    Summary for: {mockProjects.find(p => p.id === projectId)?.name || 'Selected Project'}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                    <DollarSign className="h-8 w-8 text-primary mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Total Contract Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalContractValue)}</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                    <FileCheck2 className="h-8 w-8 text-green-600 mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Total Approved</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalApproved)}</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                    <HandCoins className="h-8 w-8 text-blue-600 mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-4 rounded-md border p-4 bg-card-foreground/5">
                    <DollarSign className="h-8 w-8 text-amber-600 mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Outstanding Approved Payments</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.balanceToPay)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
};


export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClaim, setCurrentClaim] = useState<Partial<Claim> | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj1'); // Default to a project
  const [selectedBoqItemId, setSelectedBoqItemId] = useState<string>('');
  const [claimedQuantity, setClaimedQuantity] = useState<number>(0);
  const [submittedBy, setSubmittedBy] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  
  const availableBoqItems = mockProjects.find(p => p.id === selectedProjectId)?.boqItems || [];
  const selectedBoqItemDetails = availableBoqItems.find(b => b.id === selectedBoqItemId);
  const previouslyClaimed = selectedBoqItemId ? claims.filter(c => c.boqItemId === selectedBoqItemId && (c.status === 'Approved' || c.status === 'Paid')).reduce((acc, c) => acc + c.claimedQuantity, 0) : 0;
  const maxClaimable = selectedBoqItemDetails ? selectedBoqItemDetails.totalQty - previouslyClaimed : 0;
  const isOverClaim = claimedQuantity > maxClaimable;

  const handleAddNewClaim = () => {
    setCurrentClaim(null);
    // Keep selected project
    setSelectedBoqItemId('');
    setClaimedQuantity(0);
    setSubmittedBy('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleViewClaim = (claim: Claim) => {
    setCurrentClaim(claim);
    setSelectedProjectId(claim.projectId);
    setSelectedBoqItemId(claim.boqItemId);
    setClaimedQuantity(claim.claimedQuantity);
    setSubmittedBy(claim.submittedBy);
    setRemarks(claim.remarks || '');
    setIsModalOpen(true);
  };

  const handleSubmitClaim = () => {
    if (!selectedProjectId || !selectedBoqItemId || claimedQuantity <= 0 || !submittedBy || !selectedBoqItemDetails || isOverClaim) {
        alert("Please fill all required fields correctly and ensure quantity does not exceed the balance.");
        return;
    }
    const project = mockProjects.find(p => p.id === selectedProjectId);
    const calculatedAmount = claimedQuantity * selectedBoqItemDetails.subRate;

    const newClaim: Claim = {
        id: String(Date.now()),
        projectId: selectedProjectId,
        projectName: project?.name || 'Unknown Project',
        boqItemId: selectedBoqItemId,
        boqItemDescription: selectedBoqItemDetails.description,
        boqTotalQuantity: selectedBoqItemDetails.totalQty,
        claimedQuantity,
        claimedAmount: calculatedAmount,
        submittedBy,
        submissionDate: new Date().toISOString().split('T')[0],
        status: 'Pending',
        remarks
    };
    setClaims([newClaim, ...claims]);
    setIsModalOpen(false);
  };

  const handleUpdateClaimStatus = (claimId: string, status: Claim['status']) => {
    setClaims(claims.map(c => c.id === claimId ? { ...c, status: status, remarks: c.remarks || (status === 'Approved' ? 'Approved by QS' : status === 'Rejected' ? 'Rejected by QS' : 'Paid by Accounts')} : c));
  };
  
  const filteredClaims = claims.filter(claim =>
    (claim.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.boqItemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedProjectId || claim.projectId === selectedProjectId)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Claims & Payments</h1>
          <p className="text-muted-foreground">Submit, review, and manage project claims and payments.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleAddNewClaim}><PlusCircle className="mr-2 h-4 w-4" /> Submit New Claim</Button>
            <Button variant="outline" disabled><UploadCloud className="mr-2 h-4 w-4" /> Upload Claims</Button>
        </div>
      </div>

       <Card>
        <CardContent className="pt-6">
             <Label htmlFor="project-filter">Filter by Project</Label>
             <Select onValueChange={setSelectedProjectId} value={selectedProjectId || undefined}>
                <SelectTrigger id="project-filter" className="w-full md:w-1/2">
                    <SelectValue placeholder="Select a project to see summary & claims" />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
            </Select>
        </CardContent>
      </Card>
      
      {selectedProjectId && <FinancialSummary claims={claims} projectId={selectedProjectId} />}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentClaim?.id ? 'Review Claim' : 'Submit New Claim'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <fieldset disabled={!!currentClaim?.id} className="space-y-4">
                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select value={selectedProjectId} onValueChange={v => {setSelectedProjectId(v); setSelectedBoqItemId('');}}>
                    <SelectTrigger id="project"><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{mockProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="boqItem">BOQ Item</Label>
                  <Select value={selectedBoqItemId} onValueChange={setSelectedBoqItemId} disabled={!selectedProjectId}>
                    <SelectTrigger id="boqItem"><SelectValue placeholder="Select BOQ item" /></SelectTrigger>
                    <SelectContent>{availableBoqItems.map(b => <SelectItem key={b.id} value={b.id}>{b.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                 {selectedBoqItemDetails && (
                    <Card className="bg-muted/50 p-3 text-sm">
                        <CardContent className="p-0 space-y-1">
                            <p>BOQ Total Quantity: <span className="font-bold">{selectedBoqItemDetails.totalQty} {selectedBoqItemDetails.unit}</span></p>
                            <p>Previously Approved/Paid: <span className="font-bold">{previouslyClaimed} {selectedBoqItemDetails.unit}</span></p>
                            <p>Balance to Claim: <span className="font-bold text-primary">{maxClaimable} {selectedBoqItemDetails.unit}</span></p>
                        </CardContent>
                    </Card>
                )}
                <div>
                    <Label htmlFor="claimedQuantity">Quantity to Claim</Label>
                    <Input id="claimedQuantity" type="number" value={claimedQuantity} onChange={e => setClaimedQuantity(parseFloat(e.target.value) || 0)} max={maxClaimable} />
                    {isOverClaim && <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Cannot claim more than the balance.</p>}
                </div>
                <div><Label htmlFor="submittedBy">Submitted By (Subcontractor)</Label><Input id="submittedBy" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} /></div>
            </fieldset>
            <div><Label htmlFor="remarks">Remarks</Label><Textarea id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remarks or justification..." /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            {currentClaim?.id && currentClaim.status === 'Pending' && (
              <>
                <Button variant="destructive" onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Rejected'); setIsModalOpen(false);}}>Reject</Button>
                <Button onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Approved'); setIsModalOpen(false);}}>Approve</Button>
              </>
            )}
             {currentClaim?.id && currentClaim.status === 'Approved' && (
                <Button onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Paid'); setIsModalOpen(false);}}>Mark as Paid</Button>
            )}
            {!currentClaim?.id && <Button onClick={handleSubmitClaim} disabled={isOverClaim}>Submit Claim</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
            <Input type="search" placeholder="Search claims..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project / BOQ Item</TableHead>
                  <TableHead className="text-right">Claimed Qty</TableHead>
                  <TableHead className="text-right">Claimed (R)</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.length > 0 ? filteredClaims.map(claim => {
                  const progress = (claim.claimedQuantity / claim.boqTotalQuantity) * 100;
                  const statusVariant = {
                    'Paid': 'default',
                    'Approved': 'secondary',
                    'Pending': 'outline',
                    'Rejected': 'destructive'
                  }[claim.status] as "default" | "secondary" | "outline" | "destructive";

                  return (
                  <TableRow key={claim.id}>
                    <TableCell>
                        <p className="font-medium">{claim.projectName}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{claim.boqItemDescription}</p>
                    </TableCell>
                    <TableCell className="text-right">{claim.claimedQuantity} / {claim.boqTotalQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(claim.claimedAmount).replace('ZAR', '')}</TableCell>
                    <TableCell>
                        <Progress value={progress} className="h-2 w-[100px]" />
                        <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                    </TableCell>
                    <TableCell>{claim.submittedBy}</TableCell>
                    <TableCell>{format(new Date(claim.submissionDate), 'PP')}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant}>
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewClaim(claim)} className="text-muted-foreground hover:text-primary" title="View/Review Claim">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}) : (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No claims found for the selected project.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         <CardFooter>
            <p className="text-sm text-muted-foreground">
                Showing {filteredClaims.length} of {claims.length} total claims.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
