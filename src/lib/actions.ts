
"use server";

import { suggestFinesFromDescription } from "@/ai/flows/suggest-fines-from-description";
import { players } from "@/lib/data";

export async function getFineSuggestion(description: string) {
  if (!description) {
    return { error: "Description cannot be empty." };
  }

  try {
    const result = await suggestFinesFromDescription({ description });

    // Match suggested player names with actual player objects
    const suggestedPlayersData = result.suggestedPlayers
      .map(name => players.find(p => p.name === name || p.nickname === name))
      .filter(p => p !== undefined) as { id: string; name: string }[];
    
    return {
      suggestedReason: result.suggestedReason,
      suggestedPlayers: suggestedPlayersData,
    };
  } catch (error) {
    console.error("Error getting fine suggestion:", error);
    return { error: "Failed to get AI suggestion. Please try again." };
  }
}
