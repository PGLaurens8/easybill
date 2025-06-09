// This file can be used to define common TypeScript types used across the application.

export interface Project {
  id: string;
  name: string;
  description: string;
  units: { id: string; name: string; status: string }[]; // Example structure
  status: 'Ongoing' | 'Completed' | 'Planned';
  // Add other project-specific fields as needed
}

export interface BOQItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  tradeId?: string; // Optional: To link to a trade category
  // Add other BOQ item-specific fields
}

export interface Claim {
  id: string;
  projectId: string;
  projectName: string;
  boqItemId: string; // Link to a BOQItem
  boqItemDescription: string;
  claimedQuantity: number;
  claimedAmount: number;
  submittedBy: string; // Subcontractor name or ID
  submissionDate: string; // ISO date string
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
  approvedQuantity?: number; // Quantity approved by QS
  approvedAmount?: number; // Amount approved by QS
  // Add other claim-specific fields
}

export interface PaymentCertificate {
  id: string;
  certificateNumber: string;
  projectId: string;
  projectName: string;
  issueDate: string; // ISO date string
  totalAmount: number;
  status: 'Draft' | 'Issued' | 'Paid';
  relatedClaimIds?: string[]; // IDs of claims included in this certificate
  // Add other certificate-specific fields
}

// User type from Firebase is usually sufficient, but you can extend it if needed
// import type { User as FirebaseUser } from 'firebase/auth';
// export interface AppUser extends FirebaseUser {
//   role?: 'Admin' | 'QS' | 'Subcontractor'; 
// }
