
"use server";

import { players as staticPlayers } from './static-data';
import { suggestFinesFromDescription as suggestFinesFromDescriptionAI } from "@/ai/flows/suggest-fines-from-description";

async function getPlayers() {
  // We are using static data now
  return staticPlayers;
}

export async function getFineSuggestion(description: string) {
  if (!description) {
    return { error: "Description cannot be empty." };
  }

  try {
    const players = await getPlayers();
    // The AI flow can still be used, it doesn't depend on Firebase directly
    const result = await suggestFinesFromDescriptionAI({ description });

    // Match suggested player names with actual player objects from static data
    const suggestedPlayersData = result.suggestedPlayers
      .map(rawName => {
        const name = String(rawName || '').trim();
        const lname = name.toLowerCase();
        // Match by exact or substring on name or nickname, case-insensitive
        return (
          players.find(p => p.name === name || p.nickname === name) ||
          players.find(p =>
            (p.name?.toLowerCase?.().includes(lname)) ||
            (p.nickname?.toLowerCase?.().includes(lname))
          )
        );
      })
      .filter((p): p is { id: string; name: string } => !!p);
    
    return {
      suggestedReason: result.suggestedReason,
      suggestedPlayers: suggestedPlayersData,
    };
  } catch (error) {
    console.error("Error getting fine suggestion:", error);
    return { error: "Failed to get AI suggestion. Please try again." };
  }
}
