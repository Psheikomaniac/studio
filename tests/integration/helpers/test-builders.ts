/**
 * Test Data Builders for Integration Tests
 * Provides builder pattern for creating test data with realistic defaults
 */

import type {
  Player,
  Fine,
  Payment,
  Due,
  DuePayment,
  Beverage,
} from '@/lib/types';

/**
 * Builder for creating test players
 */
export class PlayerBuilder {
  private player: Partial<Player> = {};

  constructor(id?: string) {
    this.player.id = id || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.player.name = 'Test Player';
    this.player.nickname = 'Test';
    this.player.photoUrl = 'https://ui-avatars.com/api/?name=Test+Player';
    this.player.balance = 0;
    this.player.active = true;
  }

  withName(name: string): this {
    this.player.name = name;
    this.player.nickname = name.split(' ')[0];
    this.player.photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    return this;
  }

  withBalance(balance: number): this {
    this.player.balance = balance;
    return this;
  }

  withEmail(email: string): this {
    this.player.email = email;
    return this;
  }

  inactive(): this {
    this.player.active = false;
    return this;
  }

  build(): Player {
    return this.player as Player;
  }
}

/**
 * Builder for creating test fines
 */
export class FineBuilder {
  private fine: Partial<Fine> = {};

  constructor(userId: string, id?: string) {
    const now = new Date().toISOString();
    this.fine.id = id || `fine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.fine.userId = userId;
    this.fine.reason = 'Late to practice';
    this.fine.amount = 10;
    this.fine.date = now;
    this.fine.paid = false;
    this.fine.createdAt = now;
    this.fine.updatedAt = now;
  }

  withReason(reason: string): this {
    this.fine.reason = reason;
    return this;
  }

  withAmount(amount: number): this {
    this.fine.amount = amount;
    return this;
  }

  paid(paidAt?: string): this {
    this.fine.paid = true;
    this.fine.paidAt = paidAt || new Date().toISOString();
    this.fine.amountPaid = this.fine.amount;
    return this;
  }

  partiallyPaid(amountPaid: number): this {
    this.fine.paid = false;
    this.fine.amountPaid = amountPaid;
    return this;
  }

  withDate(date: string): this {
    this.fine.date = date;
    return this;
  }

  build(): Fine {
    return this.fine as Fine;
  }
}

/**
 * Builder for creating test payments
 */
export class PaymentBuilder {
  private payment: Partial<Payment> = {};

  constructor(userId: string, id?: string) {
    const now = new Date().toISOString();
    this.payment.id = id || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.payment.userId = userId;
    this.payment.reason = 'Season payment';
    this.payment.amount = 100;
    this.payment.date = now;
    this.payment.paid = true;
    this.payment.paidAt = now;
  }

  withReason(reason: string): this {
    this.payment.reason = reason;
    return this;
  }

  withAmount(amount: number): this {
    this.payment.amount = amount;
    return this;
  }

  withDate(date: string): this {
    this.payment.date = date;
    return this;
  }

  unpaid(): this {
    this.payment.paid = false;
    this.payment.paidAt = null;
    return this;
  }

  build(): Payment {
    return this.payment as Payment;
  }
}

/**
 * Builder for creating test dues
 */
export class DueBuilder {
  private due: Partial<Due> = {};

  constructor(id?: string) {
    const now = new Date().toISOString();
    this.due.id = id || `due_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.due.name = 'Season 2024/25';
    this.due.amount = 50;
    this.due.createdAt = now;
    this.due.active = true;
    this.due.archived = false;
  }

  withName(name: string): this {
    this.due.name = name;
    return this;
  }

  withAmount(amount: number): this {
    this.due.amount = amount;
    return this;
  }

  archived(): this {
    this.due.active = false;
    this.due.archived = true;
    return this;
  }

  build(): Due {
    return this.due as Due;
  }
}

/**
 * Builder for creating test due payments
 */
export class DuePaymentBuilder {
  private duePayment: Partial<DuePayment> = {};

  constructor(dueId: string, userId: string, userName: string, id?: string) {
    const now = new Date().toISOString();
    this.duePayment.id = id || `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.duePayment.dueId = dueId;
    this.duePayment.userId = userId;
    this.duePayment.userName = userName;
    this.duePayment.amountDue = 50;
    this.duePayment.paid = false;
    this.duePayment.exempt = false;
    this.duePayment.createdAt = now;
  }

  withAmount(amountDue: number): this {
    this.duePayment.amountDue = amountDue;
    return this;
  }

  paid(paidAt?: string): this {
    this.duePayment.paid = true;
    this.duePayment.paidAt = paidAt || new Date().toISOString();
    this.duePayment.amountPaid = this.duePayment.amountDue;
    return this;
  }

  partiallyPaid(amountPaid: number): this {
    this.duePayment.paid = false;
    this.duePayment.amountPaid = amountPaid;
    return this;
  }

  exempt(): this {
    this.duePayment.exempt = true;
    return this;
  }

  build(): DuePayment {
    return this.duePayment as DuePayment;
  }
}

/**
 * Builder for creating test beverages
 */
export class BeverageBuilder {
  private beverage: Partial<Beverage> = {};

  constructor(id?: string) {
    this.beverage.id = id || `bev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.beverage.name = 'Beer';
    this.beverage.price = 3.5;
  }

  withName(name: string): this {
    this.beverage.name = name;
    return this;
  }

  withPrice(price: number): this {
    this.beverage.price = price;
    return this;
  }

  build(): Beverage {
    return this.beverage as Beverage;
  }
}

// Export convenience functions
export const createPlayer = (id?: string) => new PlayerBuilder(id);
export const createFine = (userId: string, id?: string) => new FineBuilder(userId, id);
export const createPayment = (userId: string, id?: string) => new PaymentBuilder(userId, id);
export const createDue = (id?: string) => new DueBuilder(id);
export const createDuePayment = (dueId: string, userId: string, userName: string, id?: string) =>
  new DuePaymentBuilder(dueId, userId, userName, id);
export const createBeverage = (id?: string) => new BeverageBuilder(id);
