export interface Player {
  id: string;
  name: string;
  nickname: string;
  photoUrl: string;
  balance: number;
}

export interface Fine {
  id: string;
  playerIds: string[];
  description: string;
  amount: number;
  createdAt: string; // ISO string
  status: 'open' | 'paid';
}

export interface PredefinedFine {
  reason: string;
  amount: number;
}

export interface Transaction {
  id: string;
  playerId: string;
  change: number;
  reason: string;
  timestamp: string; // ISO string
}
