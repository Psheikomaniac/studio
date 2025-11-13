/**
 * Test Data Helper
 *
 * Provides utilities for generating test data for E2E tests
 */

export class TestDataHelper {
  /**
   * Generate a unique player name
   */
  static generatePlayerName(): string {
    const timestamp = Date.now();
    const names = ['Max', 'John', 'Sarah', 'Emma', 'Michael', 'Lisa'];
    const surnames = ['Mustermann', 'Doe', 'Schmidt', 'Mueller', 'Wagner', 'Fischer'];
    const name = names[Math.floor(Math.random() * names.length)];
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    return `${name} ${surname} ${timestamp}`;
  }

  /**
   * Generate a unique nickname
   */
  static generateNickname(): string {
    const timestamp = Date.now();
    const nicknames = ['Maxi', 'Johnny', 'Sari', 'Emmy', 'Michi', 'Lisi'];
    const nickname = nicknames[Math.floor(Math.random() * nicknames.length)];
    return `${nickname}${timestamp}`;
  }

  /**
   * Generate a fine reason
   */
  static generateFineReason(): string {
    const reasons = [
      'Late to training',
      'Missed team meeting',
      'Forgot equipment',
      'Red card in match',
      'Skipped warm-up',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Generate a random amount between min and max
   */
  static generateAmount(min: number = 5, max: number = 50): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a payment reason
   */
  static generatePaymentReason(): string {
    const reasons = [
      'Guthaben',
      'Guthaben Rest',
      'Einzahlung: Test Payment',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Generate a CSV file name for testing
   */
  static generateCSVFileName(type: 'dues' | 'transactions' | 'punishments'): string {
    const timestamp = Date.now();
    return `test-${type}-${timestamp}.csv`;
  }

  /**
   * Wait for a specific duration
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
