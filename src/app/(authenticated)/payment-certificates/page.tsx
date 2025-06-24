
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, Search, PlusCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input'; // Added Input import
import { format } from 'date-fns';

// Mock data
interface PaymentCertificate {
  id: string;
  certificateNumber: string;
  projectId: string;
  projectName: string;
  issueDate: string;
  totalAmount: number;
  status: 'Draft' | 'Issued' | 'Paid';
}

const initialCertificates: PaymentCertificate[] = [
  { id: 'pc1', certificateNumber: 'PC-SKY-001', projectId: '1', projectName: 'Skyline Towers', issueDate: '2023-11-01', totalAmount: 70000, status: 'Issued' },
  { id: 'pc2', certificateNumber: 'PC-SKY-002', projectId: '1', projectName: 'Skyline Towers', issueDate: '2023-12-01', totalAmount: 95000, status: 'Paid' },
  { id: 'pc3', certificateNumber: 'PC-GRN-001', projectId: '2', projectName: 'Greenfield Mall', issueDate: '2024-01-15', totalAmount: 150000, status: 'Draft' },
];

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};

export default function PaymentCertificatesPage() {
  const [certificates, setCertificates] = useState<PaymentCertificate[]>(initialCertificates);
  const [searchTerm, setSearchTerm] = useState('');

  const handleGeneratePdf = (certificateId: string) => {
    // Placeholder for PDF generation logic
    alert(`Generating PDF for certificate ID: ${certificateId}. (This is a placeholder action)`);
    // In a real app, this would involve a library like jsPDF or a server-side PDF generation service.
  };

  const filteredCertificates = certificates.filter(cert =>
    cert.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Payment Certificates</h1>
          <p className="text-muted-foreground">Manage and generate payment certificates for projects.</p>
        </div>
        <Button asChild>
          <Link href="/payment-certificates/new" className="flex items-center gap-2"> {/* Placeholder link */}
            <PlusCircle className="h-5 w-5" /> Generate New Certificate
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Search className="absolute ml-3 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search certificates..."
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
                  <TableHead>Cert. Number</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.length > 0 ? filteredCertificates.map(cert => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">{cert.certificateNumber}</TableCell>
                    <TableCell>{cert.projectName}</TableCell>
                    <TableCell>{format(new Date(cert.issueDate), 'PP')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cert.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={cert.status === 'Paid' ? 'default' : cert.status === 'Issued' ? 'secondary' : 'outline'}>
                        {cert.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                       <Button variant="ghost" size="icon" asChild className="text-muted-foreground hover:text-primary">
                         <Link href={`/payment-certificates/${cert.id}`}> {/* Placeholder link */}
                           <Eye className="h-4 w-4" />
                         </Link>
                       </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleGeneratePdf(cert.id)} className="text-muted-foreground hover:text-primary">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <FileDown className="h-4 w-4" /> {/* Placeholder for other export options */}
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="text-center">No payment certificates found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-sm text-muted-foreground">
                Showing {filteredCertificates.length} of {certificates.length} certificates.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
