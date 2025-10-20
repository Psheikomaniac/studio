import type { Player, Fine, PredefinedFine } from './types';

export const players: Player[] = [
  { id: '1', name: 'Alex Meier', nickname: 'Fußballgott', balance: 15.5, photoUrl: 'https://picsum.photos/seed/player1/400/400' },
  { id: '2', name: 'Ben Schmidt', nickname: 'Benny', balance: -25.0, photoUrl: 'https://picsum.photos/seed/player2/400/400' },
  { id: '3', name: 'Carla Weber', nickname: 'CW', balance: 0, photoUrl: 'https://picsum.photos/seed/player3/400/400' },
  { id: '4', name: 'David Fischer', nickname: 'Dave', balance: 50.25, photoUrl: 'https://picsum.photos/seed/player4/400/400' },
  { id: '5', name: 'Emil Huber', nickname: 'E', balance: -5.0, photoUrl: 'https://picsum.photos/seed/player5/400/400' },
  { id: '6', name: 'Frida Wagner', nickname: 'Frida', balance: 10.0, photoUrl: 'https://picsum.photos/seed/player6/400/400' },
  { id: '7', name: 'Gerd Müller', nickname: 'Bomber', balance: -60.5, photoUrl: 'https://picsum.photos/seed/player7/400/400' },
  { id: '8', name: 'Hans Zimmer', nickname: 'Composer', balance: 20.0, photoUrl: 'https://picsum.photos/seed/player8/400/400' },
];

export const predefinedFines: PredefinedFine[] = [
    { reason: 'Late for training', amount: 5.0 },
    { reason: 'Forgot jersey', amount: 10.0 },
    { reason: 'Yellow card (moaning)', amount: 2.5 },
    { reason: 'Red card', amount: 20.0 },
    { reason: 'Missed team event', amount: 15.0 },
    { reason: 'Phone in cabin', amount: 5.0 },
];

export const fines: Fine[] = [
  { id: 'f1', playerIds: ['2', '5'], description: 'Late for training', amount: 5.0, createdAt: new Date('2024-07-20T19:05:00').toISOString(), status: 'open' },
  { id: 'f2', playerIds: ['7'], description: 'Red card', amount: 20.0, createdAt: new Date('2024-07-18T16:30:00').toISOString(), status: 'open' },
  { id: 'f3', playerIds: ['1'], description: 'Forgot jersey', amount: 10.0, createdAt: new Date('2024-07-15T18:55:00').toISOString(), status: 'paid' },
  { id: 'f4', playerIds: ['2'], description: 'Yellow card (moaning)', amount: 2.5, createdAt: new Date('2024-07-12T19:00:00').toISOString(), status: 'open' },
  { id: 'f5', playerIds: ['4', '6'], description: 'Phone in cabin', amount: 5.0, createdAt: new Date('2024-06-30T10:00:00').toISOString(), status: 'paid' },
  { id: 'f6', playerIds: ['7'], description: 'Missed team event', amount: 15.0, createdAt: new Date('2024-06-25T19:30:00').toISOString(), status: 'open' },
];
