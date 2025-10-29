
'use client';

// Force dynamic rendering since this page uses Firebase hooks
export const dynamic = 'force-dynamic';

import Image from 'next/image';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Player } from '@/lib/types';
import { usePlayers, usePlayersService } from '@/services/players.service';
import { AddEditPlayerDialog } from '@/components/players/add-edit-player-dialog';
import { DeletePlayerDialog } from '@/components/players/delete-player-dialog';
import { useToast } from "@/hooks/use-toast";


export default function PlayersPage() {
  // Firebase hooks for real-time data
  const { data: players, isLoading, error } = usePlayers();
  const playersService = usePlayersService();

  // Handle case where Firebase is not available
  const isFirebaseUnavailable = !playersService;

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
              <CardTitle>All Players</CardTitle>
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
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players?.map((player) => {
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
                        <TableCell
                          className={`text-right font-semibold ${
                            balance < 0
                              ? 'text-destructive'
                              : 'text-positive'
                          }`}
                        >
                          €{balance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditClick(player)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(player)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {players?.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                      No players found. You might need to add some.
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
