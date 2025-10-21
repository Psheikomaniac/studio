
'use client';

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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Player } from '@/lib/types';
import { players as staticPlayers } from '@/lib/static-data';
import { AddEditPlayerDialog } from '@/components/players/add-edit-player-dialog';
import { DeletePlayerDialog } from '@/components/players/delete-player-dialog';
import { useToast } from "@/hooks/use-toast";


export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>(staticPlayers);
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

  const handleSavePlayer = (playerData: Omit<Player, 'id' | 'balance' | 'totalPaidPenalties' | 'totalUnpaidPenalties'> & { id?: string }) => {
    if (selectedPlayer) {
      // Edit mode
      setPlayers(players.map(p => p.id === selectedPlayer.id ? { ...p, ...playerData } : p));
      toast({ title: "Player Updated", description: `${playerData.name} has been updated.` });
    } else {
      // Add mode
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        ...playerData,
        balance: 0,
        totalPaidPenalties: 0,
        totalUnpaidPenalties: 0,
      };
      setPlayers([...players, newPlayer]);
      toast({ title: "Player Added", description: `${newPlayer.name} has been added.` });
    }
    setAddEditDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedPlayer) {
      setPlayers(players.filter(p => p.id !== selectedPlayer.id));
      toast({ variant: "destructive", title: "Player Deleted", description: `${selectedPlayer.name} has been removed.` });
      setDeleteDialogOpen(false);
      setSelectedPlayer(null);
    }
  };


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
                          <Image
                            alt="Player image"
                            className="aspect-square rounded-full object-cover"
                            height="40"
                            src={player.photoUrl || 'https://picsum.photos/seed/placeholder/40/40'}
                            width="40"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{player.name}</TableCell>
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
