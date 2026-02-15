/**
 * Integration Tests: AI Fine Suggestions
 * Tests AI-powered fine suggestion generation with Genkit + Gemini
 */

import { describe, it, expect, vi } from 'vitest';
import { getFineSuggestion } from '@/lib/actions';

// Mock the AI flow to avoid actual API calls in tests
vi.mock('@/ai/flows/suggest-fines-from-description', () => ({
  suggestFinesFromDescription: vi.fn(async ({ description }: { description: string }) => {
    // Mock AI responses based on description
    if (description.toLowerCase().includes('late')) {
      return {
        suggestedReason: 'Late to practice',
        suggestedPlayers: ['John', 'Mike'],
      };
    }

    if (description.toLowerCase().includes('forgot')) {
      return {
        suggestedReason: 'Forgot equipment',
        suggestedPlayers: ['Alice'],
      };
    }

    if (description.toLowerCase().includes('celebration')) {
      return {
        suggestedReason: 'Excessive celebration',
        suggestedPlayers: ['Bob', 'Charlie', 'David'],
      };
    }

    return {
      suggestedReason: 'General misconduct',
      suggestedPlayers: [],
    };
  }),
}));

describe('Integration: AI Fine Suggestions', () => {
  describe('Fine Suggestion Generation', () => {
    it('should generate fine suggestions from description (Given-When-Then)', async () => {
      // Given: Description of a transgression
      const description = 'John and Mike were late to practice today';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Should return suggested reason and players
      expect(result.error).toBeUndefined();
      expect(result.suggestedReason).toBe('Late to practice');
      expect(result.suggestedPlayers).toBeDefined();
      expect(result.suggestedPlayers?.length).toBeGreaterThan(0);
    });

    it('should handle single player suggestions', async () => {
      // Given: Description with one player
      const description = 'Alice forgot her equipment again';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Should suggest single player
      expect(result.error).toBeUndefined();
      expect(result.suggestedReason).toBe('Forgot equipment');
      expect(result.suggestedPlayers).toHaveLength(1);
    });

    it('should handle multiple player suggestions', async () => {
      // Given: Description with multiple players
      const description = 'Bob, Charlie, and David had an excessive celebration after the goal';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Should suggest all players
      expect(result.error).toBeUndefined();
      expect(result.suggestedReason).toBe('Excessive celebration');
      expect(result.suggestedPlayers).toHaveLength(3);
    });

    it('should handle empty suggestions gracefully', async () => {
      // Given: Vague description
      const description = 'Something happened';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Should return suggestion with empty players
      expect(result.error).toBeUndefined();
      expect(result.suggestedReason).toBeDefined();
      expect(result.suggestedPlayers).toHaveLength(0);
    });
  });

  describe('Input Validation', () => {
    it('should reject empty description', async () => {
      // Given: Empty description
      const description = '';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Should return error
      expect(result.error).toBe('Description cannot be empty.');
      expect(result.suggestedReason).toBeUndefined();
      expect(result.suggestedPlayers).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle AI API failures gracefully', async () => {
      // Mock API failure for one call
      vi.mocked((await import('@/ai/flows/suggest-fines-from-description')).suggestFinesFromDescription)
        .mockRejectedValueOnce(new Error('API Error'));

      // Given: Valid description but API fails
      const description = 'Test description';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Should return user-friendly error
      expect(result.error).toBe('Failed to get AI suggestion. Please try again.');
      expect(result.suggestedReason).toBeUndefined();

      // No restore needed: mockRejectedValueOnce only affects a single invocation
    });
  });

  describe('Integration with Static Player Data', () => {
    it('should match AI suggestions with static players', async () => {
      // Given: Description that matches static player names
      const description = 'John was late';

      // When: Requesting AI suggestion
      const result = await getFineSuggestion(description);

      // Then: Players should be matched from static data
      expect(result.error).toBeUndefined();
      expect(result.suggestedPlayers).toBeDefined();

      // Verify suggested players have required fields
      result.suggestedPlayers?.forEach(player => {
        expect(player.id).toBeDefined();
        expect(player.name).toBeDefined();
      });
    });

    it('should filter out non-matching player names', async () => {
      // Given: AI suggests a player not in static data
      vi.mocked((await import('@/ai/flows/suggest-fines-from-description')).suggestFinesFromDescription)
        .mockResolvedValueOnce({
          suggestedReason: 'Test',
          suggestedPlayers: ['NonExistentPlayer'],
        });

      // When: Requesting suggestion
      const result = await getFineSuggestion('test');

      // Then: Non-existent players should be filtered out
      expect(result.error).toBeUndefined();
      expect(result.suggestedPlayers).toHaveLength(0);

      // No restore needed: mockResolvedValueOnce only affects a single invocation
    });
  });

  describe('AI Response Parsing', () => {
    it('should handle various reason formats', async () => {
      const testCases = [
        'late',
        'Late to practice',
        'LATE',
        'forgot equipment',
      ];

      for (const description of testCases) {
        const result = await getFineSuggestion(description);
        expect(result.error).toBeUndefined();
        expect(result.suggestedReason).toBeTruthy();
        expect(typeof result.suggestedReason).toBe('string');
      }
    });
  });
});
