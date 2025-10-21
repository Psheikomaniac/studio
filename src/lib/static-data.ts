
import type { Player, Fine, PredefinedFine } from './types';

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
