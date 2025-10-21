

import type { Player, Fine, PredefinedFine, Payment, Beverage, Transaction } from './types';

export const players: Player[] = [
  {
    id: "1",
    name: "Alex Schmidt",
    nickname: "Schmidti",
    photoUrl: "https://picsum.photos/seed/player1/400/400",
    balance: -15.50,
    totalPaidPenalties: 20,
    totalUnpaidPenalties: 35.50,
  },
  {
    id: "2",
    name: "Ben Müller",
    nickname: "Benny",
    photoUrl: "https://picsum.photos/seed/player2/400/400",
    balance: 5.00,
    totalPaidPenalties: 50,
    totalUnpaidPenalties: 45,
  },
  {
    id: "3",
    name: "Carla Weber",
    nickname: "Carly",
    photoUrl: "https://picsum.photos/seed/player3/400/400",
    balance: 0,
    totalPaidPenalties: 30,
    totalUnpaidPenalties: 30,
  },
  {
    id: "4",
    name: "David Klein",
    nickname: "Dave",
    photoUrl: "https://picsum.photos/seed/player4/400/400",
    balance: -5.00,
    totalPaidPenalties: 10,
    totalUnpaidPenalties: 15,
  },
  {
    id: "5",
    name: "Eva Lang",
    nickname: "Evi",
    photoUrl: "https://picsum.photos/seed/player5/400/400",
    balance: 20.00,
    totalPaidPenalties: 100,
    totalUnpaidPenalties: 80,
  }
];

export const fines: Fine[] = [
    {
        id: "fine1",
        userId: "1",
        reason: "Late for training",
        amount: 5.00,
        date: "2024-05-10T19:00:00Z",
        paid: false,
        createdAt: "2024-05-10T20:30:00Z",
        updatedAt: "2024-05-10T20:30:00Z",
    },
    {
        id: "fine2",
        userId: "2",
        reason: "Forgot equipment",
        amount: 10.00,
        date: "2024-05-10T19:00:00Z",
        paid: true,
        paidAt: "2024-05-15T12:00:00Z",
        createdAt: "2024-05-10T20:31:00Z",
        updatedAt: "2024-05-15T12:00:00Z",
    },
    {
        id: "fine3",
        userId: "1",
        reason: "Yellow card (dissent)",
        amount: 7.50,
        date: "2024-05-12T15:30:00Z",
        paid: false,
        createdAt: "2024-05-12T17:00:00Z",
        updatedAt: "2024-05-12T17:00:00Z",
    },
     {
        id: "fine4",
        userId: "4",
        reason: "Late for game",
        amount: 15.00,
        date: "2024-04-28T14:00:00Z",
        paid: true,
        paidAt: "2024-05-01T18:00:00Z",
        createdAt: "2024-04-28T16:00:00Z",
        updatedAt: "2024-05-01T18:00:00Z",
    },
    {
        id: "fine5",
        userId: "5",
        reason: "Forgot to pay team fees",
        amount: 25.00,
        date: "2024-05-01T00:00:00Z",
        paid: false,
        createdAt: "2024-05-02T10:00:00Z",
        updatedAt: "2024-05-02T10:00:00Z",
    }
];

export const predefinedFines: PredefinedFine[] = [
    { id: "pf1", reason: "Late for training", amount: 5.00 },
    { id: "pf2", reason: "Late for game", amount: 10.00 },
    { id: "pf3", reason: "Yellow card (foul)", amount: 5.00 },
    { id: "pf4", reason: "Yellow card (dissent)", amount: 7.50 },
    { id: "pf5", reason: "Red card", amount: 20.00 },
    { id: "pf6", reason: "Forgot equipment", amount: 2.50 },
    { id: "pf7", reason: "Phone in locker room", amount: 1.00 },
];

export const payments: Payment[] = [
    {
        id: "payment1",
        userId: "1",
        reason: "Team Fee 2024/25",
        amount: 120.00,
        date: "2024-08-01T10:00:00Z",
        paid: true,
        paidAt: "2024-08-05T14:30:00Z",
    },
    {
        id: "payment2",
        userId: "2",
        reason: "Team Fee 2024/25",
        amount: 120.00,
        date: "2024-08-01T10:00:00Z",
        paid: false,
    },
    {
        id: "payment3",
        userId: "3",
        reason: "Contribution to Team Event",
        amount: 25.00,
        date: "2024-09-15T18:00:00Z",
        paid: true,
        paidAt: "2024-09-20T11:00:00Z",
    }
];

export const beverages: Beverage[] = [
    { id: "bev1", name: "Water", price: 1.00 },
    { id: "bev2", name: "Beer (Pilsner)", price: 1.50 },
    { id: "bev3", name: "Beer (Wheat)", price: 1.80 },
    { id: "bev4", name: "Soft Drink (Cola)", price: 1.20 },
    { id: "bev5", name: "Soft Drink (Orange)", price: 1.20 },
];

export const transactions: Transaction[] = [
    // Fines
    { id: "trx1", userId: "1", amount: -5.00, description: "Late for training", date: "2024-05-10T20:30:00Z", relatedFineId: "fine1" },
    { id: "trx2", userId: "2", amount: -10.00, description: "Forgot equipment", date: "2024-05-10T20:31:00Z", relatedFineId: "fine2" },
    { id: "trx3", userId: "1", amount: -7.50, description: "Yellow card (dissent)", date: "2024-05-12T17:00:00Z", relatedFineId: "fine3" },
    { id: "trx4", userId: "4", amount: -15.00, description: "Late for game", date: "2024-04-28T16:00:00Z", relatedFineId: "fine4" },
    { id: "trx5", userId: "5", amount: -25.00, description: "Forgot to pay team fees", date: "2024-05-02T10:00:00Z", relatedFineId: "fine5" },
    
    // Payments (credit to the user's fine account)
    { id: "trx6", userId: "2", amount: 10.00, description: "Paid: Forgot equipment", date: "2024-05-15T12:00:00Z" },
    { id: "trx7", userId: "4", amount: 15.00, description: "Paid: Late for game", date: "2024-05-01T18:00:00Z" },

    // Beverages (debit)
    { id: "trx8", userId: "1", amount: -1.50, description: "Beer (Pilsner)", date: "2024-05-11T21:00:00Z", relatedBeverageId: "bev2" },
    { id: "trx9", userId: "3", amount: -1.80, description: "Beer (Wheat)", date: "2024-05-11T21:05:00Z", relatedBeverageId: "bev3" },
    { id: "trx10", userId: "1", amount: -1.50, description: "Beer (Pilsner)", date: "2024-05-11T21:30:00Z", relatedBeverageId: "bev2" },
];
