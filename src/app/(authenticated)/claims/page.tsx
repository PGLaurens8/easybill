
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

const initialClaims: Claim[] = [
  { id: 'claim1', projectId: '1', projectName: 'Skyline Towers Residential Complex', boqItemId: 'item1.2', boqItemDescription: 'Bulk Excavation for foundations (up to 2m depth)', claimedQuantity: 500, claimedAmount: 25000, submittedBy: 'Excavators Inc.', submissionDate: '2023-10-15', status: 'Approved', remarks: 'Site verification complete. Quantities match.' },
  { id: 'claim2', projectId: '1', projectName: 'Skyline Towers Residential Complex', boqItemId: 'item2.2', boqItemDescription: 'Reinforced Cement Concrete (RCC) - M25 for Slabs', claimedQuantity: 120, claimedAmount: 90000, submittedBy: 'Concrete Masters Ltd.', submissionDate: '2023-10-20', status: 'Pending' },
  { id: 'claim3', projectId: '2', projectName: 'Greenfield Shopping Mall', boqItemId: 'item3.1', boqItemDescription: 'Brickwork in Cement Mortar 1:6 (230mm thick walls)', claimedQuantity: 250, claimedAmount: 225000, submittedBy: 'Masonry Pro Builders', submissionDate: '2023-11-01', status: 'Rejected', remarks: 'Claimed quantity exceeds work completed for this phase. Please revise.' },
  { id: 'claim4', projectId: '1', projectName: 'Skyline Towers Residential Complex', boqItemId: 'item2.3', boqItemDescription: 'Formwork for RCC Columns (plywood finish)', claimedQuantity: 300, claimedAmount: 45000, submittedBy: 'Shuttering Solutions', submissionDate: '2023-11-05', status: 'Pending' },
  { id: 'claim5', projectId: '2', projectName: 'Greenfield Shopping Mall', boqItemId: 'item1.1', boqItemDescription: 'Site Clearance including removal of shrubs and debris', claimedQuantity: 1500, claimedAmount: 15000, submittedBy: 'GreenScape Landscaping', submissionDate: '2023-11-10', status: 'Approved', remarks: 'All clear as per plan.' },
  { id: 'claim6', projectId: '3', projectName: 'Oceanview Corporate Park', boqItemId: 'item5.1', boqItemDescription: 'Two coats of acrylic emulsion paint on internal walls', claimedQuantity: 2000, claimedAmount: 100000, submittedBy: 'Painters United', submissionDate: '2024-01-20', status: 'Pending' },
];

const mockProjects = [
  {
    id: '1',
    name: 'Skyline Towers Residential Complex',
    boqItems: [
      {id: 'item1.1', description: 'Site Clearance including removal of shrubs and debris'},
      {id: 'item1.2', description: 'Bulk Excavation for foundations (up to 2m depth)'},
      {id: 'item2.2', description: 'Reinforced Cement Concrete (RCC) - M25 for Slabs'},
      {id: 'item2.3', description: 'Formwork for RCC Columns (plywood finish)'},
      {id: 'item4.1', description: 'Supply and installation of UPVC pipes for drainage (110mm dia)'}
    ]
  },
  {
    id: '2',
    name: 'Greenfield Shopping Mall',
    boqItems: [
      {id: 'item1.1', description: 'Site Clearance including removal of shrubs and debris'},
      {id: 'item3.1', description: 'Brickwork in Cement Mortar 1:6 (230mm thick walls)'},
      {id: 'item3.2', description: 'Internal Plastering (12mm thick) in CM 1:4'},
      {id: 'item5.2', description: 'Vitrified tile flooring (600x600mm) in rooms'}
    ]
  },
  {
    id: '3',
    name: 'Oceanview Corporate Park',
    boqItems: [
      {id: 'item2.1', description: 'Plain Cement Concrete (PCC) 1:4:8 in foundation blinding'},
      {id: 'item5.1', description: 'Two coats of acrylic emulsion paint on internal walls'},
      {id: 'item4.2', description: 'Installation of standard white ceramic wash basin with pedestal'}
    ]
  }
];


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
            <div><Label htmlFor="claimedAmount">Claimed Amount</Label><Input id="claimedAmount" type="number" value={claimedAmount} onChange={e => setClaimedAmount(parseFloat(e.target.value) || 0)} disabled={!!(currentClaim && currentClaim.id)} /></div>
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
                  <TableHead className="text-right">Amount</TableHead>
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
                    <TableCell className="text-right">${claim.claimedAmount.toFixed(2)}</TableCell>
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
