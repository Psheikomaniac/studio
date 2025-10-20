"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { AddFineDialog } from "./add-fine-dialog";
import PlayerGrid from "./player-grid";
import type { Player, Fine, PredefinedFine } from "@/lib/types";
import { Stats } from "./stats";
import { DashboardCharts } from "./charts";
import { SidebarTrigger } from "../ui/sidebar";

type DashboardClientProps = {
  initialData: {
    players: Player[];
    fines: Fine[];
    predefinedFines: PredefinedFine[];
  };
};

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "debt" | "credit">("all");
  const [isAddFineOpen, setAddFineOpen] = useState(false);

  const filteredPlayers = initialData.players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.nickname.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === "debt") return matchesSearch && player.balance < 0;
    if (filter === "credit") return matchesSearch && player.balance > 0;
    
    return matchesSearch;
  });

  const handleFineAdded = (newFine: any) => {
    // Here you would typically re-fetch data or update state
    console.log("New fine added:", newFine);
  };

  return (
    <>
      <main className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
            <SidebarTrigger className="md:hidden" />
            <h1 className="font-headline text-xl font-semibold md:text-2xl">
                Dashboard
            </h1>
            <div className="relative ml-auto flex-1 md:grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search players..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button onClick={() => setAddFineOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Fine
            </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Stats players={initialData.players} fines={initialData.fines} />

            <div className="flex items-center gap-2">
                <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
                <Button variant={filter === 'debt' ? 'destructive' : 'outline'} className={filter === 'debt' ? 'bg-destructive/90' : ''} onClick={() => setFilter('debt')}>Debt</Button>
                <Button variant={filter === 'credit' ? 'secondary' : 'outline'} className={filter === 'credit' ? 'bg-positive/90 text-positive-foreground' : ''} onClick={() => setFilter('credit')}>Credit</Button>
            </div>
            
            <PlayerGrid players={filteredPlayers} />

            <DashboardCharts fines={initialData.fines} />
        </div>
      </main>
      <AddFineDialog
        isOpen={isAddFineOpen}
        setOpen={setAddFineOpen}
        players={initialData.players}
        predefinedFines={initialData.predefinedFines}
        onFineAdded={handleFineAdded}
      />
    </>
  );
}
