import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";
import { formatEuro } from "@/lib/csv-utils";

type PlayerCardProps = {
  player: Player;
};

export default function PlayerCard({ player }: PlayerCardProps) {
  const balanceColor = player.balance > 0 ? "text-positive" : player.balance < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <Link href={`/players/${player.id}`} className="block">
      <Card className="flex flex-col overflow-hidden transition-transform hover:scale-105 hover:shadow-lg">
        <CardHeader className="relative h-32 p-0">
          <Image
            src={player.photoUrl}
            alt={`Photo of ${player.name}`}
            fill
            className="object-cover"
            data-ai-hint="athlete portrait"
          />
        </CardHeader>
        <CardContent className="flex-grow p-4">
          <h3 className="font-headline text-lg font-semibold truncate">{player.name}</h3>
          <p className="text-sm text-muted-foreground truncate">"{player.nickname}"</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <div className={cn("text-2xl font-bold", balanceColor)}>
            {formatEuro(Math.abs(player.balance))}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
