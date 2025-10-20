'use server';
/**
 * @fileOverview An AI agent that suggests relevant fine reasons and players who should be fined, based on a description of a transgression.
 *
 * - suggestFinesFromDescription - A function that handles the fine suggestion process.
 * - SuggestFinesFromDescriptionInput - The input type for the suggestFinesFromDescription function.
 * - SuggestFinesFromDescriptionOutput - The return type for the suggestFinesFromDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFinesFromDescriptionInputSchema = z.object({
  description: z.string().describe('The description of the transgression.'),
});
export type SuggestFinesFromDescriptionInput = z.infer<typeof SuggestFinesFromDescriptionInputSchema>;

const SuggestFinesFromDescriptionOutputSchema = z.object({
  suggestedReason: z.string().describe('A suggested reason for the fine.'),
  suggestedPlayers: z.array(z.string()).describe('An array of player names who should be fined.'),
});
export type SuggestFinesFromDescriptionOutput = z.infer<typeof SuggestFinesFromDescriptionOutputSchema>;

export async function suggestFinesFromDescription(input: SuggestFinesFromDescriptionInput): Promise<SuggestFinesFromDescriptionOutput> {
  return suggestFinesFromDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFinesFromDescriptionPrompt',
  input: {schema: SuggestFinesFromDescriptionInputSchema},
  output: {schema: SuggestFinesFromDescriptionOutputSchema},
  prompt: `You are an assistant to a team treasurer. Based on the description of the transgression, suggest a reason for the fine and a list of player names who should be fined.

Description: {{{description}}}

Reason: The reason for the fine.
Players: A list of comma separated player names who should be fined.

Output the reason and players in JSON format:
{
  "suggestedReason": "Reason",
 "suggestedPlayers": ["Player1", "Player2"]
}
`,
});

const suggestFinesFromDescriptionFlow = ai.defineFlow(
  {
    name: 'suggestFinesFromDescriptionFlow',
    inputSchema: SuggestFinesFromDescriptionInputSchema,
    outputSchema: SuggestFinesFromDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
