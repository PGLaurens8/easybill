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
  { id: 'claim1', projectId: '1', projectName: 'Skyline Towers', boqItemId: 'item1.2', boqItemDescription: 'Bulk Excavation', claimedQuantity: 500, claimedAmount: 25000, submittedBy: 'Excavators Inc.', submissionDate: '2023-10-15', status: 'Pending' },
  { id: 'claim2', projectId: '1', projectName: 'Skyline Towers', boqItemId: 'item2.2', boqItemDescription: 'Reinforced Cement Concrete (RCC) - M25', claimedQuantity: 100, claimedAmount: 75000, submittedBy: 'Concrete Masters Ltd.', submissionDate: '2023-10-20', status: 'Approved', remarks: 'Verified on site.' },
  { id: 'claim3', projectId: '2', projectName: 'Greenfield Mall', boqItemId: 'item3.1', boqItemDescription: 'Brickwork in CM 1:6', claimedQuantity: 200, claimedAmount: 180000, submittedBy: 'Masonry Pro', submissionDate: '2023-11-01', status: 'Rejected', remarks: 'Quantities exceed BOQ allocation for this phase.' },
];

const mockProjects = [
  { id: '1', name: 'Skyline Towers', boqItems: [{id: 'item1.2', description: 'Bulk Excavation'}, {id: 'item2.2', description: 'Reinforced Cement Concrete (RCC) - M25'}] },
  { id: '2', name: 'Greenfield Mall', boqItems: [{id: 'item3.1', description: 'Brickwork in CM 1:6'}] },
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
        setClaims([...claims, newClaim]);
    }
    setIsModalOpen(false);
  };

  const handleUpdateClaimStatus = (claimId: string, status: Claim['status']) => {
    setClaims(claims.map(c => c.id === claimId ? { ...c, status: status, remarks: c.remarks || (status === 'Approved' ? 'Approved by QS' : 'Rejected by QS')} : c));
  };
  
  const filteredClaims = claims.filter(claim =>
    claim.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.boqItemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())
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
            <div><Label htmlFor="claimedQuantity">Claimed Quantity</Label><Input id="claimedQuantity" type="number" value={claimedQuantity} onChange={e => setClaimedQuantity(parseFloat(e.target.value))} disabled={!!(currentClaim && currentClaim.id)} /></div>
            <div><Label htmlFor="claimedAmount">Claimed Amount</Label><Input id="claimedAmount" type="number" value={claimedAmount} onChange={e => setClaimedAmount(parseFloat(e.target.value))} disabled={!!(currentClaim && currentClaim.id)} /></div>
            <div><Label htmlFor="submittedBy">Submitted By (Subcontractor)</Label><Input id="submittedBy" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} disabled={!!(currentClaim && currentClaim.id)} /></div>
            <div><Label htmlFor="remarks">Remarks</Label><Textarea id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} disabled={currentClaim?.status !== 'Pending' && !!currentClaim?.id} /></div>
             {currentClaim && currentClaim.id && (
                <div><Label>Status</Label><Badge variant={currentClaim.status === 'Approved' ? 'default' : currentClaim.status === 'Rejected' ? 'destructive' : 'secondary'}>{currentClaim.status}</Badge></div>
             )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            {/* Show different buttons based on context */}
            {currentClaim && currentClaim.id && currentClaim.status === 'Pending' && (
              <>
                <Button variant="destructive" onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Rejected'); setIsModalOpen(false);}}>Reject</Button>
                <Button onClick={() => {handleUpdateClaimStatus(currentClaim!.id!, 'Approved'); setIsModalOpen(false);}}>Approve</Button>
              </>
            )}
            {(!currentClaim || !currentClaim.id) && ( // New claim submission
                 <Button onClick={handleSubmitClaim}>Submit Claim</Button>
            )}
            {/* If just viewing, no action buttons other than close */}
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Search className="absolute ml-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-1/3"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>BOQ Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.length > 0 ? filteredClaims.map(claim => (
                  <TableRow key={claim.id}>
                    <TableCell>{claim.projectName}</TableCell>
                    <TableCell className="max-w-xs truncate">{claim.boqItemDescription}</TableCell>
                    <TableCell>{claim.claimedQuantity}</TableCell>
                    <TableCell>${claim.claimedAmount.toFixed(2)}</TableCell>
                    <TableCell>{claim.submittedBy}</TableCell>
                    <TableCell>{new Date(claim.submissionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={claim.status === 'Approved' ? 'default' : claim.status === 'Rejected' ? 'destructive' : 'secondary'}>
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewClaim(claim)} className="text-muted-foreground hover:text-primary">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* QS actions could be here if user role is QS and status is Pending */}
                      {claim.status === 'Pending' && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleUpdateClaimStatus(claim.id, 'Approved')} className="text-green-600 hover:text-green-700">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleUpdateClaimStatus(claim.id, 'Rejected')} className="text-red-600 hover:text-red-700">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="text-center">No claims found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
