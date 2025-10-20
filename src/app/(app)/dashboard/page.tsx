'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import { AddFineDialog } from '@/components/dashboard/add-fine-dialog';
import PlayerGrid from '@/components/dashboard/player-grid';
import type { Player, Fine, PredefinedFine } from '@/lib/types';
import { Stats } from '@/components/dashboard/stats';
import { DashboardCharts } from '@/components/dashboard/charts';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt' | 'credit'>('all');
  const [isAddFineOpen, setAddFineOpen] = useState(false);

  const firestore = useFirestore();

  const playersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: players, isLoading: isLoadingPlayers } = useCollection<Player>(playersQuery);

  const finesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'penalties')) : null),
    [firestore]
  );
  const { data: fines, isLoading: isLoadingFines } = useCollection<Fine>(finesQuery);

  const predefinedFinesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'predefinedFines')) : null),
    [firestore]
  );
  const { data: predefinedFines, isLoading: isLoadingPredefinedFines } = useCollection<PredefinedFine>(predefinedFinesQuery);

  const calculateBalance = (player: Player) => {
    return (player.totalPaidPenalties || 0) - (player.totalUnpaidPenalties || 0);
  }

  const getPlayersWithBalance = (players: Player[] | null) => {
    if (!players) return [];
    return players.map(p => ({
      ...p,
      balance: calculateBalance(p)
    }));
  }

  const playersWithBalance = getPlayersWithBalance(players);

  const filteredPlayers = playersWithBalance.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filter === 'debt') return matchesSearch && player.balance < 0;
    if (filter === 'credit') return matchesSearch && player.balance > 0;

    return matchesSearch;
  });

  const handleFineAdded = (newFine: any) => {
    // TODO: Implement logic to add fine to Firestore
    console.log('New fine added:', newFine);
  };

  const isLoading = isLoadingPlayers || isLoadingFines || isLoadingPredefinedFines;

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
          <Button
            onClick={() => setAddFineOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isLoading}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Fine
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {isLoading ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
             </div>
          ) : (
            <Stats players={playersWithBalance} fines={fines || []} />
          )}

          <div className="flex items-center gap-2">
            <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
            <Button variant={filter === 'debt' ? 'destructive' : 'outline'} className={filter === 'debt' ? 'bg-destructive/90' : ''} onClick={() => setFilter('debt')}>Debt</Button>
            <Button variant={filter === 'credit' ? 'secondary' : 'outline'} className={filter === 'credit' ? 'bg-positive/90 text-positive-foreground' : ''} onClick={() => setFilter('credit')}>Credit</Button>
          </div>

          {isLoading ? (
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-60" />)}
             </div>
          ) : (
            <PlayerGrid players={filteredPlayers} />
          )}

          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : (
            <DashboardCharts fines={fines || []} />
          )}
        </div>
      </main>
      <AddFineDialog
        isOpen={isAddFineOpen}
        setOpen={setAddFineOpen}
        players={players || []}
        predefinedFines={predefinedFines || []}
        onFineAdded={handleFineAdded}
      />
    </>
  );
}
