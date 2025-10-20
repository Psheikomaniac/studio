
"use server";

import { suggestFinesFromDescription } from "@/ai/flows/suggest-fines-from-description";
import { collection, getDocs, getFirestore } from "firebase/firestore";
import { initializeFirebase, getSdks } from "@/firebase/index";
import { Player } from "./types";


async function getPlayers() {
  // This is a server-side action, so we need to initialize firebase admin here
  // in a real app this would be initialized once.
  const { firestore } = getSdks(initializeFirebase().firebaseApp);
  const playersSnapshot = await getDocs(collection(firestore, "users"));
  const players: Player[] = [];
  playersSnapshot.forEach((doc) => {
    players.push({ id: doc.id, ...doc.data() } as Player);
  });
  return players;
}

export async function getFineSuggestion(description: string) {
  if (!description) {
    return { error: "Description cannot be empty." };
  }

  try {
    const players = await getPlayers();
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
