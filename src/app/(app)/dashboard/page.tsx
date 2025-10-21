
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import PlayerGrid from '@/components/dashboard/player-grid';
import type { Player, Fine } from '@/lib/types';
import { Stats } from '@/components/dashboard/stats';
import { DashboardCharts } from '@/components/dashboard/charts';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { players as staticPlayers, fines as staticFines } from '@/lib/static-data';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'debt' | 'credit'>('all');

  const players = staticPlayers;
  const fines = staticFines;

  const filteredPlayers = players.filter((player) => {
    const nameMatch = player.name ? player.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const nicknameMatch = player.nickname ? player.nickname.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const matchesSearch = nameMatch || nicknameMatch;

    if (filter === 'debt') return matchesSearch && player.balance < 0;
    if (filter === 'credit') return matchesSearch && player.balance > 0;

    return matchesSearch;
  });

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
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Stats players={players} fines={fines} />

          <div className="flex items-center gap-2">
            <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
            <Button variant={filter === 'debt' ? 'destructive' : 'outline'} className={filter === 'debt' ? 'bg-destructive/90' : ''} onClick={() => setFilter('debt')}>Debt</Button>
            <Button variant={filter === 'credit' ? 'secondary' : 'outline'} className={filter === 'credit' ? 'bg-positive/90 text-positive-foreground' : ''} onClick={() => setFilter('credit')}>Credit</Button>
          </div>

            <PlayerGrid players={filteredPlayers} />

            <DashboardCharts fines={fines} />
        </div>
      </main>
    </>
  );
}
