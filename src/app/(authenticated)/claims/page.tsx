
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle, Search, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

// Mock data
interface Claim {
  id: string;
  projectId: string;
  projectName: string;
  boqItemId: string;
  boqItemDescription: string;
  claimedQuantity: number;
  claimedAmount: number;
  submittedBy: string; // Subcontractor name or ID
  submissionDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
}

export const initialClaims: Claim[] = [
  { id: 'claim1', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'earth.2', boqItemDescription: 'Bulk excavation for foundations in normal earth', claimedQuantity: 500, claimedAmount: 250000, submittedBy: 'Excavators Inc.', submissionDate: '2023-10-15', status: 'Approved', remarks: 'Site verification complete. Quantities match.' },
  { id: 'claim2', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'concrete.2', boqItemDescription: '25 MPa / 19mm stone concrete in strip footings', claimedQuantity: 120, claimedAmount: 180000, submittedBy: 'Concrete Masters Ltd.', submissionDate: '2023-10-20', status: 'Pending' },
  { id: 'claim3', projectId: 'proj2', projectName: 'Riverbend Gardens', boqItemId: 'masonry.1', boqItemDescription: 'One brick thick (220mm) NFP brickwork', claimedQuantity: 250, claimedAmount: 225000, submittedBy: 'Masonry Pro Builders', submissionDate: '2023-11-01', status: 'Rejected', remarks: 'Claimed quantity exceeds work completed for this phase. Please revise.' },
  { id: 'claim4', projectId: 'proj1', projectName: 'The Willows Estate', boqItemId: 'concrete.3', boqItemDescription: 'Formwork to sides of strip footings', claimedQuantity: 300, claimedAmount: 45000, submittedBy: 'Shuttering Solutions', submissionDate: '2023-11-05', status: 'Pending' },
  { id: 'claim5', projectId: 'proj2', projectName: 'Riverbend Gardens', boqItemId: 'earth.1', boqItemDescription: 'Clear site of vegetation and topsoil', claimedQuantity: 1500, claimedAmount: 15000, submittedBy: 'GreenScape Landscaping', submissionDate: '2023-11-10', status: 'Approved', remarks: 'All clear as per plan.' },
  { id: 'claim6', projectId: 'proj3', projectName: 'Acacia Heights', boqItemId: 'finish.5', boqItemDescription: 'Prepare and apply three coats PVA paint to internal walls', claimedQuantity: 2000, claimedAmount: 100000, submittedBy: 'Painters United', submissionDate: '2024-01-20', status: 'Pending' },
];

const mockProjects = [
  {
    id: 'proj1',
    name: 'The Willows Estate - Phase 1 (45 Units)',
    boqItems: [
      {id: 'earth.1', description: 'Clear site of vegetation and topsoil (approx. 150mm deep) and stockpile'},
      {id: 'earth.2', description: 'Bulk excavation for foundations in normal earth, not exceeding 2m deep'},
      {id: 'concrete.2', description: '25 MPa / 19mm stone concrete in strip footings'},
      {id: 'concrete.3', description: 'Formwork to sides of strip footings'},
      {id: 'plumb.7', description: '110mm uPVC soil and waste drainage pipes including fittings and rodding eyes'}
    ]
  },
  {
    id: 'proj2',
    name: 'Riverbend Gardens - Secure Development (70 Units)',
    boqItems: [
      {id: 'earth.1', description: 'Clear site of vegetation and topsoil (approx. 150mm deep) and stockpile'},
      {id: 'masonry.1', description: 'One brick thick (220mm) NFP (Non-Facing Plastered) brickwork in Class II mortar'},
      {id: 'masonry.2', description: 'Half brick thick (110mm) NFP brickwork in Class II mortar for internal non-loadbearing walls'},
      {id: 'finish.3', description: 'Ceramic floor tiles (600x600mm) including adhesive and grout, on screed'}
    ]
  },
  {
    id: 'proj3',
    name: 'Acacia Heights - Mixed-Use Residential (60 Units)',
    boqItems: [
      {id: 'concrete.1', description: '25 MPa / 19mm stone concrete in surface beds (100mm thick)'},
      {id: 'finish.5', description: 'Prepare and apply three coats PVA paint to internal plastered walls'},
      {id: 'plumb.2', description: 'Supply and install vanity wash hand basin (500mm) with mixer tap and waste'}
    ]
  }
];

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};


export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClaim, setCurrentClaim] = useState<Partial<Claim> | null>(null);

  // Form fields state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedBoqItemId, setSelectedBoqItemId] = useState<string>('');
  const [claimedQuantity, setClaimedQuantity] = useState<number>(0);
  const [claimedAmount, setClaimedAmount] = useState<number>(0);
  const [submittedBy, setSubmittedBy] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');


  const handleAddNewClaim = () => {
    setCurrentClaim(null);
    setSelectedProjectId('');
    setSelectedBoqItemId('');
    setClaimedQuantity(0);
    setClaimedAmount(0);
    setSubmittedBy('');
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleViewClaim = (claim: Claim) => {
    setCurrentClaim(claim);
    setSelectedProjectId(claim.projectId);
    setSelectedBoqItemId(claim.boqItemId);
    setClaimedQuantity(claim.claimedQuantity);
    setClaimedAmount(claim.claimedAmount);
    setSubmittedBy(claim.submittedBy);
    setRemarks(claim.remarks || '');
    setIsModalOpen(true); // Re-using modal for viewing/editing
  };

  const handleSubmitClaim = () => {
    // Basic validation
    if (!selectedProjectId || !selectedBoqItemId || claimedQuantity <= 0 || claimedAmount <=0 || !submittedBy) {
        alert("Please fill all required fields.");
        return;
    }
    const project = mockProjects.find(p => p.id === selectedProjectId);
    const boqItem = project?.boqItems.find(b => b.id === selectedBoqItemId);

    if (currentClaim && currentClaim.id) { // Editing existing claim - QS action
      setClaims(claims.map(c =>
        c.id === currentClaim.id
        ? { ...c, remarks: remarks, status: c.status } // Simplified edit: only remarks & status by QS
        : c
      ));
    } else { // New claim submission - Subcontractor action
        const newClaim: Claim = {
            id: String(Date.now()),
            projectId: selectedProjectId,
            projectName: project?.name || 'Unknown Project',
            boqItemId: selectedBoqItemId,
            boqItemDescription: boqItem?.description || 'Unknown Item',
            claimedQuantity,
            claimedAmount,
            submittedBy,
            submissionDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            remarks
        };
        setClaims([newClaim, ...claims]); // Add to the beginning of the list
    }
    setIsModalOpen(false);
  };

  const handleUpdateClaimStatus = (claimId: string, status: Claim['status']) => {
    // For modal-based updates, this can set the status and remarks before closing.
    // For direct table actions, it just updates status with a default remark.
    setClaims(claims.map(c => c.id === claimId ? { ...c, status: status, remarks: c.remarks || (status === 'Approved' ? 'Approved by QS' : 'Rejected by QS')} : c));
  };

  const filteredClaims = claims.filter(claim =>
    claim.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.boqItemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBoqItems = mockProjects.find(p => p.id === selectedProjectId)?.boqItems || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Claims Management</h1>
          <p className="text-muted-foreground">Submit, review, and manage project claims.</p>
        </div>
        <Button onClick={handleAddNewClaim} className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" /> Submit New Claim
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{currentClaim && currentClaim.id && currentClaim.status !== 'Pending' ? 'View Claim' : currentClaim && currentClaim.id ? 'Review Claim' : 'Submit New Claim'}</DialogTitle>
            <DialogDescription>
              {currentClaim && currentClaim.id && currentClaim.status !== 'Pending' ? 'Details of the claim.' : currentClaim && currentClaim.id ? 'Review and approve/reject the claim.' : 'Fill in the details for the new claim.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={!!(currentClaim && currentClaim.id)}>
                <SelectTrigger id="project"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{mockProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="boqItem">BOQ Item</Label>
              <Select value={selectedBoqItemId} onValueChange={setSelectedBoqItemId} disabled={!selectedProjectId || !!(currentClaim && currentClaim.id)}>
                <SelectTrigger id="boqItem"><SelectValue placeholder="Select BOQ item" /></SelectTrigger>
                <SelectContent>{availableBoqItems.map(b => <SelectItem key={b.id} value={b.id}>{b.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="claimedQuantity">Claimed Quantity</Label><Input id="claimedQuantity" type="number" value={claimedQuantity} onChange={e => setClaimedQuantity(parseFloat(e.target.value) || 0)} disabled={!!(currentClaim && currentClaim.id)} /></div>
            <div><Label htmlFor="claimedAmount">Claimed Amount (R)</Label><Input id="claimedAmount" type="number" value={claimedAmount} onChange={e => setClaimedAmount(parseFloat(e.target.value) || 0)} disabled={!!(currentClaim && currentClaim.id)} /></div>
            <div><Label htmlFor="submittedBy">Submitted By (Subcontractor)</Label><Input id="submittedBy" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} disabled={!!(currentClaim && currentClaim.id)} /></div>
            <div><Label htmlFor="remarks">Remarks</Label><Textarea id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} disabled={currentClaim?.status !== 'Pending' && !!currentClaim?.id} placeholder="Add remarks or justification..." /></div>
             {currentClaim && currentClaim.id && (
                <div><Label>Status</Label><Badge variant={currentClaim.status === 'Approved' ? 'default' : currentClaim.status === 'Rejected' ? 'destructive' : 'secondary'}>{currentClaim.status}</Badge></div>
             )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            {/* Show different buttons based on context */}
            {currentClaim && currentClaim.id && currentClaim.status === 'Pending' && (
              <>
                <Button variant="destructive" onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Rejected'); setClaims(prev => prev.map(c => c.id === currentClaim!.id ? {...c, status: 'Rejected', remarks: remarks || 'Rejected by QS'} : c)); setIsModalOpen(false);}}>Reject</Button>
                <Button onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Approved'); setClaims(prev => prev.map(c => c.id === currentClaim!.id ? {...c, status: 'Approved', remarks: remarks || 'Approved by QS'} : c)); setIsModalOpen(false);}}>Approve</Button>
              </>
            )}
            {(!currentClaim || !currentClaim.id) && ( // New claim submission
                 <Button onClick={handleSubmitClaim}>Submit Claim</Button>
            )}
            {/* If just viewing (not pending), no action buttons other than close */}
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Search className="absolute ml-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search claims by project, item, submitter or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-2/3 lg:w-1/2"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead className="min-w-[250px]">BOQ Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount (R)</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.length > 0 ? filteredClaims.map(claim => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.projectName}</TableCell>
                    <TableCell className="max-w-xs truncate" title={claim.boqItemDescription}>{claim.boqItemDescription}</TableCell>
                    <TableCell className="text-right">{claim.claimedQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(claim.claimedAmount).replace('ZAR', '')}</TableCell>
                    <TableCell>{claim.submittedBy}</TableCell>
                    <TableCell>{format(new Date(claim.submissionDate), 'PP')}</TableCell>
                    <TableCell>
                      <Badge variant={claim.status === 'Approved' ? 'default' : claim.status === 'Rejected' ? 'destructive' : 'secondary'}>
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewClaim(claim)} className="text-muted-foreground hover:text-primary" title="View/Review Claim">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {claim.status === 'Pending' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleUpdateClaimStatus(claim.id, 'Approved')} className="text-green-600 hover:text-green-700" title="Approve Claim">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleUpdateClaimStatus(claim.id, 'Rejected')} className="text-red-600 hover:text-red-700" title="Reject Claim">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center h-24">No claims found matching your search.</TableCell></TableRow>
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
