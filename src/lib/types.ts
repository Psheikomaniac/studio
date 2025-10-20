export interface Player {
  id: string;
  name: string;
  nickname: string;
  photoUrl: string;
  balance: number; // This will be calculated from penalties
  email?: string;
  phone?: string;
  totalUnpaidPenalties: number;
  totalPaidPenalties: number;
}

export interface Fine {
  id: string;
  playerIds: string[];
  description: string;
  amount: number;
  createdAt: string; // ISO string
  status: 'open' | 'paid';
  paidAt?: string; // ISO string for when it was paid
}

export interface PredefinedFine {
  id: string;
  reason: string;
  amount: number;
}

export interface Transaction {
  id: string;
  playerId: string;
  change: number; // Positive for credit, negative for debit
  reason: string;
  timestamp: string; // ISO string
  relatedFineId?: string;
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
