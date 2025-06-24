
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

// MOCK DATA - In a real app, this would be fetched from a database based on the certificate ID.
// This data combines certificate info with project and item details.

interface CertificateItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
}

interface DetailedCertificate {
  id: string;
  certificateNumber: string;
  projectId: string;
  projectName: string;
  projectClient: string;
  contractor: string;
  issueDate: string;
  status: 'Draft' | 'Issued' | 'Paid';
  items: CertificateItem[];
  previousPayments: number;
}

const mockDetailedCertificates: DetailedCertificate[] = [
  {
    id: 'pc1',
    certificateNumber: 'PC-SKY-001',
    projectId: '1',
    projectName: 'Skyline Towers',
    projectClient: 'Metropolis Developments',
    contractor: 'Constructo Corp',
    issueDate: '2023-11-01',
    status: 'Issued',
    previousPayments: 0,
    items: [
      { id: 'item1', description: 'Bulk excavation for foundations', unit: 'm³', quantity: 500, rate: 120 },
      { id: 'item2', description: 'Formwork to sides of strip footings', unit: 'm²', quantity: 100, rate: 100 },
    ],
  },
  {
    id: 'pc2',
    certificateNumber: 'PC-SKY-002',
    projectId: '1',
    projectName: 'Skyline Towers',
    projectClient: 'Metropolis Developments',
    contractor: 'Constructo Corp',
    issueDate: '2023-12-01',
    status: 'Paid',
    previousPayments: 70000,
    items: [
      { id: 'item3', description: '25 MPa concrete in strip footings', unit: 'm³', quantity: 40, rate: 2050 },
      { id: 'item4', description: 'High tensile steel reinforcement', unit: 'kg', quantity: 500, rate: 26 },
    ],
  },
  {
    id: 'pc3',
    certificateNumber: 'PC-GRN-001',
    projectId: '2',
    projectName: 'Greenfield Mall',
    projectClient: 'Urban Retail Properties',
    contractor: 'Mall Builders Inc.',
    issueDate: '2024-01-15',
    status: 'Draft',
    previousPayments: 0,
    items: [
      { id: 'item5', description: 'Site clearance and grubbing', unit: 'Sum', quantity: 1, rate: 80000 },
      { id: 'item6', description: 'Structural steel for main atrium', unit: 'tonne', quantity: 5, rate: 14000 },
    ],
  },
];


const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
};

export default function PaymentCertificateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const certificateId = params.id as string;
  const [certificate, setCertificate] = useState<DetailedCertificate | null>(null);

  useEffect(() => {
    const foundCertificate = mockDetailedCertificates.find(c => c.id === certificateId);
    if (foundCertificate) {
      setCertificate(foundCertificate);
    } else {
      // Handle not found, maybe redirect or show an error message
    }
  }, [certificateId]);

  if (!certificate) {
    return <div className="flex items-center justify-center h-full">Loading certificate...</div>;
  }

  const handlePrint = () => {
    window.print();
  };
  
  const valueThisCertificate = certificate.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
  const totalValueToDate = certificate.previousPayments + valueThisCertificate;
  const amountDue = valueThisCertificate;


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Certificate
        </Button>
      </div>

      <Card id="certificate-content" className="p-4 sm:p-8 shadow-lg bg-white print:shadow-none print:border-none">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold font-headline text-primary">Payment Certificate</h1>
              <p className="text-muted-foreground">Certificate No: <span className="font-semibold text-foreground">{certificate.certificateNumber}</span></p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">QuantEasy Solutions</p>
              <p className="text-sm text-muted-foreground">Professional Quantity Surveyors</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-sm">
           <div className="border p-4 rounded-md">
              <h3 className="font-semibold mb-2 border-b pb-1">Project Details</h3>
              <p><strong>Project:</strong> {certificate.projectName}</p>
              <p><strong>Client:</strong> {certificate.projectClient}</p>
            </div>
            <div className="border p-4 rounded-md">
               <h3 className="font-semibold mb-2 border-b pb-1">Contractor</h3>
               <p><strong>Company:</strong> {certificate.contractor}</p>
            </div>
            <div className="border p-4 rounded-md">
                <h3 className="font-semibold mb-2 border-b pb-1">Certificate Details</h3>
                <p><strong>Issue Date:</strong> {format(new Date(certificate.issueDate), 'PP')}</p>
                <p><strong>Status:</strong> <span className="font-semibold">{certificate.status}</span></p>
            </div>
        </section>

        <Separator className="my-6" />

        <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 font-headline">Valuation of Work Done</h2>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[300px]">Description</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount (ZAR)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {certificate.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.description}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.rate)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </section>

        <Separator className="my-6" />

        <section className="flex justify-end">
            <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Value of work this certificate</span>
                    <span className="font-semibold">{formatCurrency(valueThisCertificate)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Value of previous certificates</span>
                    <span className="font-semibold">{formatCurrency(certificate.previousPayments)}</span>
                </div>
                 <div className="flex justify-between font-bold">
                    <span className="text-muted-foreground">Total value of work to date</span>
                    <span className="">{formatCurrency(totalValueToDate)}</span>
                </div>
                
                {/* Could add fields for retention, etc. here in a real app */}
                
                <Separator/>
                <div className="flex justify-between text-xl font-bold text-primary pt-2">
                    <span>Amount Due this Certificate</span>
                    <span>{formatCurrency(amountDue)}</span>
                </div>
            </div>
        </section>
        
        <footer className="mt-16 text-xs text-muted-foreground text-center border-t pt-4">
            <p>This is a computer-generated document from QuantEasy. This certificate is issued subject to the terms and conditions of the contract.</p>
            <p>For any queries, please contact your appointed Quantity Surveyor.</p>
        </footer>
      </Card>
    </div>
  );
}
