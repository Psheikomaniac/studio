

export interface Player {
  id: string;
  name: string;
  nickname: string;
  photoUrl: string;
  balance: number;
  email?: string;
  phone?: string;
  totalUnpaidPenalties: number;
  totalPaidPenalties: number;
  active?: boolean; // if false, player is inactive and should be hidden from assignment pickers
}

export interface Fine {
  id: string;
  userId: string;
  reason: string;
  amount: number;
  date: string; // ISO string
  paid: boolean;
  paidAt?: string | null; // ISO string for when it was paid
  amountPaid?: number | null; // Amount already paid (for partial payments)
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface PredefinedFine {
  id: string;
  reason: string;
  amount: number;
}

export enum PaymentCategory {
  PAYMENT = 'PAYMENT', // Paying a fine/due
  DEPOSIT = 'DEPOSIT', // Adding credit
  TRANSFER = 'TRANSFER'
}

export interface Payment {
  id: string;
  userId: string;
  reason: string;
  category?: PaymentCategory;
  amount: number;
  date: string; // ISO string
  paid: boolean;
  paidAt?: string | null; // ISO string
}

export interface Beverage {
    id: string;
    name: string;
    price: number;
}

export interface BeverageConsumption {
  id: string;
  userId: string;
  beverageId: string;
  beverageName: string;
  amount: number;           // Price of beverage
  date: string;             // ISO string
  paid: boolean;
  paidAt?: string | null;          // ISO string
  amountPaid?: number | null;      // Amount already paid (for partial payments)
  createdAt: string;        // ISO string
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number; // Positive for credit, negative for debit
  description: string;
  date: string; // ISO string
  relatedFineId?: string;
  relatedPaymentId?: string;
  relatedBeverageId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  action: string;
  entityType: 'player' | 'fine' | 'transaction';
  entityId: string;
  userId: string; // ID of the admin/treasurer who performed the action
  details: string; // e.g., "Changed fine amount from 5.00 to 7.50"
}

export interface Due {
  id: string;
  name: string;              // "Saison2526", "Meistershi", etc.
  amount: number;            // In EUR (converted from cents)
  createdAt: string;         // ISO string
  active: boolean;
  archived: boolean;
}

export interface DuePayment {
  id: string;
  dueId: string;            // Links to Due.id
  userId: string;           // Links to Player.id
  userName: string;         // Player display name
  amountDue: number;
  paid: boolean;
  paidAt?: string | null;          // ISO string
  amountPaid?: number | null;      // Amount already paid (for partial payments)
  exempt: boolean;          // STATUS_EXEMPT from CSV
  createdAt: string;        // ISO string
}
