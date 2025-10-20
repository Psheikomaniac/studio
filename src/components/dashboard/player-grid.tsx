import type { Player } from "@/lib/types";
import PlayerCard from "./player-card";

type PlayerGridProps = {
  players: Player[];
};

export default function PlayerGrid({ players }: PlayerGridProps) {
  if (players.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-12 text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">No players found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
}
