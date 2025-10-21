
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MoreHorizontal, PlusCircle, CreditCard } from "lucide-react";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from "@/hooks/use-toast";
import type { Fine, Player, PredefinedFine } from "@/lib/types";
import { fines as staticFines, players as staticPlayers, predefinedFines as staticPredefinedFines } from '@/lib/static-data';
import { AddFineDialog } from '@/components/dashboard/add-fine-dialog';
import { EditFineDialog } from '@/components/fines/edit-fine-dialog';
import { DeleteFineDialog } from '@/components/fines/delete-fine-dialog';

export default function FinesPage() {
  const [fines, setFines] = useState<Fine[]>(staticFines);
  const [players] = useState<Player[]>(staticPlayers);
  const [predefinedFines] = useState<PredefinedFine[]>(staticPredefinedFines);

  const [isAddFineOpen, setAddFineOpen] = useState(false);
  const [isEditFineOpen, setEditFineOpen] = useState(false);
  const [isDeleteFineOpen, setDeleteFineOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);

  const { toast } = useToast();

  const getPlayerName = (id: string) => players?.find(p => p.id === id)?.name || 'Unknown';
  
  const handleAddFine = (newFineData: any) => {
    const newFines = newFineData.playerIds.map((playerId: string) => ({
      id: `fine-${Date.now()}-${playerId}`,
      userId: playerId,
      reason: newFineData.reason,
      amount: newFineData.amount,
      date: new Date().toISOString(),
      paid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setFines(prevFines => [...prevFines, ...newFines]);
    toast({
      title: "Fine(s) Added",
      description: `${newFineData.reason} was assigned to ${newFineData.playerIds.length} player(s).`
    });
  };

  const handleEditClick = (fine: Fine) => {
    setSelectedFine(fine);
    setEditFineOpen(true);
  };
  
  const handleSaveFine = (fineData: Fine) => {
    setFines(fines.map(f => f.id === fineData.id ? { ...f, ...fineData, updatedAt: new Date().toISOString() } : f));
    toast({ title: "Fine Updated", description: "The fine details have been updated." });
    setEditFineOpen(false);
  };

  const handleMarkAsPaid = (fineId: string) => {
    setFines(fines.map(f => f.id === fineId ? { ...f, paid: true, paidAt: new Date().toISOString() } : f));
    toast({ title: "Fine Paid", description: "The fine has been marked as paid." });
  };
  
  const handleDeleteClick = (fine: Fine) => {
    setSelectedFine(fine);
    setDeleteFineOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedFine) {
      setFines(fines.filter(f => f.id !== selectedFine.id));
      toast({ variant: "destructive", title: "Fine Deleted", description: "The fine has been removed." });
      setDeleteFineOpen(false);
      setSelectedFine(null);
    }
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
           <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">Fines</h1>
             <Button onClick={() => setAddFineOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Fine
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Fines</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fines?.map((fine) => (
                    <TableRow key={fine.id}>
                      <TableCell className="font-medium">{fine.reason}</TableCell>
                      <TableCell>{fine.userId ? getPlayerName(fine.userId) : 'N/A'}</TableCell>
                      <TableCell className="text-right">€{fine.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(fine.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {fine.paid ? (
                          <Badge variant="outline" className="text-positive border-positive/50">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Open
                          </Badge>
                        )}
                      </TableCell>
                       <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                               {!fine.paid && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(fine.id)}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Mark as paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEditClick(fine)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(fine)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {fines?.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                      No fines found.
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <AddFineDialog
        isOpen={isAddFineOpen}
        setOpen={setAddFineOpen}
        players={players}
        predefinedFines={predefinedFines}
        onFineAdded={handleAddFine}
      />
      <EditFineDialog
        isOpen={isEditFineOpen}
        setOpen={setEditFineOpen}
        fine={selectedFine}
        players={players}
        onSave={handleSaveFine}
      />
      <DeleteFineDialog
        isOpen={isDeleteFineOpen}
        setOpen={setDeleteFineOpen}
        onConfirm={handleDeleteConfirm}
        fineReason={selectedFine?.reason}
      />
    </>
  );
}
