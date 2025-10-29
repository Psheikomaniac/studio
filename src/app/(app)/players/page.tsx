
'use client';

// Force dynamic rendering since this page uses Firebase hooks
export const dynamic = 'force-dynamic';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, AlertCircle, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Player } from '@/lib/types';
import { updatePlayersWithCalculatedBalances } from '@/lib/utils';
import { usePlayers, usePlayersService } from '@/services/players.service';
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { AddEditPlayerDialog } from '@/components/players/add-edit-player-dialog';
import { DeletePlayerDialog } from '@/components/players/delete-player-dialog';
import { useToast } from "@/hooks/use-toast";
import { formatEuro } from "@/lib/csv-utils";


export default function PlayersPage() {
  // Firebase hooks for real-time data
  const { data: players, isLoading, error } = usePlayers();
  const playersService = usePlayersService();

  // Collection group data used for per-player aggregates (Phase 2)
  const { data: finesData } = useAllFines();
  const { data: paymentsData } = useAllPayments();
  const { data: duePaymentsData } = useAllDuePayments();
  const { data: consumptionsData } = useAllBeverageConsumptions();

  const fines = finesData || [];
  const payments = paymentsData || [];
  const duePayments = duePaymentsData || [];
  const beverageConsumptions = consumptionsData || [];

  // Recompute balances and derive per-user stats
  const enhancedPlayers = useMemo(() => {
    if (!players) return [] as Player[];
    return updatePlayersWithCalculatedBalances(
      players,
      payments,
      fines,
      duePayments,
      beverageConsumptions
    );
  }, [players, payments, fines, duePayments, beverageConsumptions]);

  const lastActivityByUser = useMemo(() => {
    const map = new Map<string, string>();
    const setIfMax = (userId?: string, date?: string) => {
      if (!userId || !date) return;
      const t = new Date(date).getTime();
      const prev = map.get(userId);
      if (!prev || t > new Date(prev).getTime()) map.set(userId, date);
    };
    fines.forEach(f => setIfMax(f.userId, f.date));
    payments.forEach(p => setIfMax(p.userId, p.date));
    duePayments.forEach(d => setIfMax(d.userId, d.createdAt));
    beverageConsumptions.forEach(b => setIfMax(b.userId, b.date));
    return map;
  }, [fines, payments, duePayments, beverageConsumptions]);

  const beverageCountByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of beverageConsumptions) {
      if (!c?.userId) continue;
      m.set(c.userId, (m.get(c.userId) ?? 0) + 1);
    }
    return m;
  }, [beverageConsumptions]);


  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { toast } = useToast();

  const handleAddClick = () => {
    setSelectedPlayer(null);
    setAddEditDialogOpen(true);
  };

  const handleEditClick = (player: Player) => {
    setSelectedPlayer(player);
    setAddEditDialogOpen(true);
  };

  const handleDeleteClick = (player: Player) => {
    setSelectedPlayer(player);
    setDeleteDialogOpen(true);
  };

  const handleSavePlayer = async (playerData: Omit<Player, 'id' | 'balance' | 'totalPaidPenalties' | 'totalUnpaidPenalties'> & { id?: string }) => {
    if (!playersService) {
      toast({
        variant: "destructive",
        title: "Firebase Not Available",
        description: "Cannot save player without Firebase connection",
      });
      return;
    }

    try {
      if (selectedPlayer) {
        // Edit mode - update existing player
        await playersService.updatePlayer(selectedPlayer.id, playerData);
        toast({ title: "Player Updated", description: `${playerData.name} has been updated.` });
      } else {
        // Add mode - create new player
        const newPlayerData = {
          ...playerData,
          balance: 0,
          totalPaidPenalties: 0,
          totalUnpaidPenalties: 0,
        };
        await playersService.createPlayer(newPlayerData);
        toast({ title: "Player Added", description: `${newPlayerData.name} has been added.` });
      }
      setAddEditDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save player',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlayer || !playersService) return;

    try {
      await playersService.deletePlayer(selectedPlayer.id);
      toast({
        variant: "destructive",
        title: "Player Deleted",
        description: `${selectedPlayer.name} has been removed.`
      });
      setDeleteDialogOpen(false);
      setSelectedPlayer(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete player',
      });
    }
  };

  const activePlayers = (enhancedPlayers ?? []).filter((p) => p.active !== false);
  const inactivePlayers = (enhancedPlayers ?? []).filter((p) => p.active === false);

  // Loading state
  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Players</AlertTitle>
          <AlertDescription>
            {error.message || 'Failed to load players. Please try again later.'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }


  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">
              Player Management
            </h1>
             <Button onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Active Players</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      <span className="sr-only">Image</span>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Beverages</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-[140px] text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePlayers.map((player) => {
                    const balance = player.balance;
                    return (
                      <TableRow key={player.id}>
                        <TableCell className="hidden sm:table-cell">
                          <a href={`/players/${player.id}`} className="inline-block">
                            <Image
                              alt="Player image"
                              className="aspect-square rounded-full object-cover"
                              height="40"
                              src={player.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=40&background=94a3b8&color=fff`}
                              width="40"
                            />
                          </a>
                        </TableCell>
                        <TableCell className="font-medium">
                          <a href={`/players/${player.id}`} className="hover:underline">{player.name}</a>
                        </TableCell>
                        <TableCell>{player.nickname}</TableCell>
                        <TableCell>
                          {(() => {
                            const d = lastActivityByUser.get(player.id);
                            return d ? <SafeLocaleDate dateString={d} /> : '-';
                          })()}
                        </TableCell>
                        <TableCell>{beverageCountByUser.get(player.id) ?? 0}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            balance < 0
                              ? 'text-destructive'
                              : 'text-positive'
                          }`}
                        >
                          {formatEuro(Math.abs(balance))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit player"
                              title="Edit"
                              onClick={() => handleEditClick(player)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Set inactive"
                              title="Set inactive"
                              onClick={async () => {
                                if (!playersService) return;
                                const nextActive = false;
                                try {
                                  await playersService.updatePlayer(player.id, { active: nextActive } as any);
                                  toast({
                                    title: "Player Deactivated",
                                    description: `${player.name} is now inactive.`,
                                  });
                                } catch (err) {
                                  toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to update player status' });
                                }
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete player"
                              title="Delete"
                              onClick={() => handleDeleteClick(player)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {activePlayers.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  No active players.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inactive Players</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      <span className="sr-only">Image</span>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Beverages</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-[140px] text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactivePlayers.map((player) => {
                    const balance = player.balance;
                    return (
                      <TableRow key={player.id}>
                        <TableCell className="hidden sm:table-cell">
                          <a href={`/players/${player.id}`} className="inline-block">
                            <Image
                              alt="Player image"
                              className="aspect-square rounded-full object-cover"
                              height="40"
                              src={player.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=40&background=94a3b8&color=fff`}
                              width="40"
                            />
                          </a>
                        </TableCell>
                        <TableCell className="font-medium">
                          <a href={`/players/${player.id}`} className="hover:underline">{player.name}</a>
                        </TableCell>
                        <TableCell>{player.nickname}</TableCell>
                        <TableCell>
                          {(() => {
                            const d = lastActivityByUser.get(player.id);
                            return d ? <SafeLocaleDate dateString={d} /> : '-';
                          })()}
                        </TableCell>
                        <TableCell>{beverageCountByUser.get(player.id) ?? 0}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            balance < 0
                              ? 'text-destructive'
                              : 'text-positive'
                          }`}
                        >
                          {formatEuro(Math.abs(balance))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit player"
                              title="Edit"
                              onClick={() => handleEditClick(player)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Set active"
                              title="Set active"
                              onClick={async () => {
                                if (!playersService) return;
                                const nextActive = true;
                                try {
                                  await playersService.updatePlayer(player.id, { active: nextActive } as any);
                                  toast({
                                    title: "Player Activated",
                                    description: `${player.name} is now active.`,
                                  });
                                } catch (err) {
                                  toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to update player status' });
                                }
                              }}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete player"
                              title="Delete"
                              onClick={() => handleDeleteClick(player)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {inactivePlayers.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  No inactive players.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <AddEditPlayerDialog
        isOpen={isAddEditDialogOpen}
        setOpen={setAddEditDialogOpen}
        onSave={handleSavePlayer}
        player={selectedPlayer}
      />
      <DeletePlayerDialog
        isOpen={isDeleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        playerName={selectedPlayer?.name}
      />
    </>
  );
}
