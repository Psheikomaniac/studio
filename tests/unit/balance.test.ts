/**
 * Balance Calculation Tests
 * CRITICAL: 100% coverage required for balance calculation logic
 *
 * Test Strategy:
 * - Scenario 1: New player with no transactions
 * - Scenario 2: Only credits (payments)
 * - Scenario 3: Credits and debits (fines)
 * - Scenario 4: Partial payments on fines
 * - Scenario 5: Complex scenario with all transaction types
 * - Scenario 6: Exempt dues (should not affect balance)
 * - Scenario 7: Paid transactions (should not create debits)
 */

import { describe, it, expect } from 'vitest';
import { calculatePlayerBalance, updatePlayersWithCalculatedBalances } from '@/lib/utils';
import {
  generatePlayer,
  generatePayment,
  generateFine,
  generateDuePayment,
  generateBeverageFine,
  generatePlayers
} from '../fixtures/generators';

describe('calculatePlayerBalance', () => {
  const PLAYER_ID = 'player-1';

  describe('Scenario 1: New player with no transactions', () => {
    it('should return 0 balance for a new player with no transactions', () => {
      const balance = calculatePlayerBalance(
        PLAYER_ID,
        [], // no payments
        [], // no fines
        [], // no dues
      );

      expect(balance).toBe(0);
    });
  });

  describe('Scenario 2: Only credits (payments)', () => {
    it('should calculate balance with single payment', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], []);

      expect(balance).toBe(50);
    });

    it('should calculate balance with multiple payments', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true }),
        generatePayment({ userId: PLAYER_ID, amount: 30, paid: true }),
        generatePayment({ userId: PLAYER_ID, amount: 20, paid: true })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], []);

      expect(balance).toBe(100);
    });

    it('should only count paid payments', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true }),
        generatePayment({ userId: PLAYER_ID, amount: 30, paid: false }) // not paid
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], []);

      expect(balance).toBe(50);
    });

    it('should only count payments for the specific player', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true }),
        generatePayment({ userId: 'player-2', amount: 100, paid: true }) // different player
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], []);

      expect(balance).toBe(50);
    });
  });

  describe('Scenario 3: Credits and debits (fines)', () => {
    it('should calculate balance with payment and unpaid fine', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true })
      ];
      const fines = [
        generateFine({ userId: PLAYER_ID, amount: 10, paid: false })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(40); // 50 - 10
    });

    it('should not deduct paid fines from balance', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true })
      ];
      const fines = [
        generateFine({ userId: PLAYER_ID, amount: 10, paid: true }) // fully paid
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(50); // fine is paid, no debit
    });

    it('should handle multiple fines', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const fines = [
        generateFine({ userId: PLAYER_ID, amount: 10, paid: false }),
        generateFine({ userId: PLAYER_ID, amount: 15, paid: false }),
        generateFine({ userId: PLAYER_ID, amount: 5, paid: true }) // paid, no debit
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(75); // 100 - 10 - 15
    });
  });

  describe('Scenario 4: Partial payments on fines', () => {
    it('should calculate balance with partially paid fine', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true })
      ];
      const fines = [
        generateFine({
          userId: PLAYER_ID,
          amount: 10,
          paid: false,
          amountPaid: 3 // 3 paid, 7 remaining
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(43); // 50 - (10 - 3)
    });

    it('should handle fine with amountPaid = 0', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true })
      ];
      const fines = [
        generateFine({
          userId: PLAYER_ID,
          amount: 10,
          paid: false,
          amountPaid: 0
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(40); // 50 - 10
    });

    it('should handle fine with amountPaid = undefined', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 50, paid: true })
      ];
      const fines = [
        generateFine({
          userId: PLAYER_ID,
          amount: 10,
          paid: false,
          amountPaid: undefined
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(40); // 50 - 10
    });

    it('should handle multiple partial payments', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const fines = [
        generateFine({
          userId: PLAYER_ID,
          amount: 20,
          paid: false,
          amountPaid: 5 // 15 remaining
        }),
        generateFine({
          userId: PLAYER_ID,
          amount: 30,
          paid: false,
          amountPaid: 10 // 20 remaining
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(65); // 100 - 15 - 20
    });
  });

  describe('Scenario 5: Complex scenario with all transaction types', () => {
    it('should calculate balance with payments, fines, dues, and beverage fines', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const fines = [
        generateFine({
          userId: PLAYER_ID,
          amount: 10,
          paid: false,
          amountPaid: 3 // -7 debit
        }),
        generateBeverageFine({
          userId: PLAYER_ID,
          amount: 5,
          paid: false // -5 debit
        })
      ];
      const duePayments = [
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: false,
          exempt: false // -50 debit
        })
      ];

      const balance = calculatePlayerBalance(
        PLAYER_ID,
        payments,
        fines,
        duePayments,
      );

      expect(balance).toBe(38); // 100 - 7 - 50 - 5 = 38
    });

    it('should handle complex scenario with paid and unpaid transactions', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 200, paid: true })
      ];
      const fines = [
        generateFine({ userId: PLAYER_ID, amount: 10, paid: false }), // -10
        generateFine({ userId: PLAYER_ID, amount: 20, paid: true }), // paid, no debit
        generateFine({
          userId: PLAYER_ID,
          amount: 15,
          paid: false,
          amountPaid: 5 // -10
        }),
        generateBeverageFine({
          userId: PLAYER_ID,
          amount: 5,
          paid: false // -5
        }),
        generateBeverageFine({
          userId: PLAYER_ID,
          amount: 3,
          paid: true // paid, no debit
        })
      ];
      const duePayments = [
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: false, // -50
          exempt: false
        }),
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: true, // paid, no debit
          exempt: false
        })
      ];

      const balance = calculatePlayerBalance(
        PLAYER_ID,
        payments,
        fines,
        duePayments,
      );

      expect(balance).toBe(125); // 200 - 10 - 10 - 50 - 5 = 125
    });
  });

  describe('Scenario 6: Exempt dues', () => {
    it('should not deduct exempt dues from balance', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const duePayments = [
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: false,
          exempt: true // exempt, no debit
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], duePayments);

      expect(balance).toBe(100); // exempt dues don't affect balance
    });

    it('should handle mix of exempt and non-exempt dues', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const duePayments = [
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: false,
          exempt: true // exempt, no debit
        }),
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 30,
          paid: false,
          exempt: false // -30 debit
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], duePayments);

      expect(balance).toBe(70); // 100 - 30
    });
  });

  describe('Scenario 7: Partial payments on dues and beverages', () => {
    it('should handle partially paid dues', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const duePayments = [
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: false,
          exempt: false,
          amountPaid: 20 // 30 remaining
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], duePayments);

      expect(balance).toBe(70); // 100 - 30
    });

    it('should handle partially paid beverage fines', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const fines = [
        generateBeverageFine({
          userId: PLAYER_ID,
          amount: 10,
          paid: false,
          amountPaid: 3 // 7 remaining
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, fines, []);

      expect(balance).toBe(93); // 100 - 7
    });

    it('should handle amountPaid = undefined for dues', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true })
      ];
      const duePayments = [
        generateDuePayment({
          userId: PLAYER_ID,
          amountDue: 50,
          paid: false,
          exempt: false,
          amountPaid: undefined
        })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, payments, [], duePayments);

      expect(balance).toBe(50); // 100 - 50
    });
  });

  describe('Edge cases', () => {
    it('should return negative balance when debits exceed credits', () => {
      const fines = [
        generateFine({ userId: PLAYER_ID, amount: 100, paid: false })
      ];

      const balance = calculatePlayerBalance(PLAYER_ID, [], fines, []);

      expect(balance).toBe(-100);
    });

    it('should handle empty arrays for all transaction types', () => {
      const balance = calculatePlayerBalance(PLAYER_ID, [], [], []);

      expect(balance).toBe(0);
    });

    it('should only include transactions for the specified player', () => {
      const payments = [
        generatePayment({ userId: PLAYER_ID, amount: 100, paid: true }),
        generatePayment({ userId: 'player-2', amount: 50, paid: true })
      ];
      const fines = [
        generateFine({ userId: PLAYER_ID, amount: 10, paid: false }),
        generateFine({ userId: 'player-2', amount: 5, paid: false }),
        generateBeverageFine({ userId: PLAYER_ID, amount: 5, paid: false }),
        generateBeverageFine({ userId: 'player-2', amount: 3, paid: false })
      ];
      const duePayments = [
        generateDuePayment({ userId: PLAYER_ID, amountDue: 20, paid: false, exempt: false }),
        generateDuePayment({ userId: 'player-2', amountDue: 30, paid: false, exempt: false })
      ];

      const balance = calculatePlayerBalance(
        PLAYER_ID,
        payments,
        fines,
        duePayments,
      );

      expect(balance).toBe(65); // 100 - 10 - 20 - 5 = 65
    });
  });
});

describe('updatePlayersWithCalculatedBalances', () => {
  it('should update all players with calculated balances', () => {
    const players = generatePlayers(2);
    const payments = [
      generatePayment({ userId: 'player-1', amount: 50, paid: true }),
      generatePayment({ userId: 'player-2', amount: 100, paid: true })
    ];
    const fines = [
      generateFine({ userId: 'player-1', amount: 10, paid: false })
    ];

    const updatedPlayers = updatePlayersWithCalculatedBalances(
      players,
      payments,
      fines,
      [],
    );

    expect(updatedPlayers[0].balance).toBe(40); // 50 - 10
    expect(updatedPlayers[1].balance).toBe(100);
  });

  it('should handle empty player array', () => {
    const updatedPlayers = updatePlayersWithCalculatedBalances([], [], [], []);

    expect(updatedPlayers).toEqual([]);
  });

  it('should preserve all player properties', () => {
    const players = [
      generatePlayer({
        id: 'player-1',
        name: 'John Doe',
        nickname: 'JD',
        email: 'john@example.com'
      })
    ];
    const payments = [
      generatePayment({ userId: 'player-1', amount: 50, paid: true })
    ];

    const updatedPlayers = updatePlayersWithCalculatedBalances(
      players,
      payments,
      [],
      [],
    );

    expect(updatedPlayers[0].id).toBe('player-1');
    expect(updatedPlayers[0].name).toBe('John Doe');
    expect(updatedPlayers[0].nickname).toBe('JD');
    expect(updatedPlayers[0].email).toBe('john@example.com');
    expect(updatedPlayers[0].balance).toBe(50);
  });
});
