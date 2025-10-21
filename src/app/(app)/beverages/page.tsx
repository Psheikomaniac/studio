
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Beverage, Player, Transaction } from "@/lib/types";
import { beverages as staticBeverages, players as staticPlayers, transactions as staticTransactions } from '@/lib/static-data';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AddEditBeverageDialog } from '@/components/beverages/add-edit-beverage-dialog';
import { DeleteBeverageDialog } from '@/components/beverages/delete-beverage-dialog';
import { RecordConsumptionDialog } from '@/components/beverages/record-consumption-dialog';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';


export default function BeveragesPage() {
  const [beverages, setBeverages] = useState<Beverage[]>(staticBeverages);
  const [players, setPlayers] = useState<Player[]>(staticPlayers);
  const [transactions, setTransactions] = useState<Transaction[]>(staticTransactions);
  
  const [isAddEditOpen, setAddEditOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isRecordConsumptionOpen, setRecordConsumptionOpen] = useState(false);
  
  const [selectedBeverage, setSelectedBeverage] = useState<Beverage | null>(null);
  const { toast } = useToast();
  
  const handleAddClick = () => {
    setSelectedBeverage(null);
    setAddEditOpen(true);
  };

  const handleEditClick = (beverage: Beverage) => {
    setSelectedBeverage(beverage);
    setAddEditOpen(true);
  };
  
  const handleDeleteClick = (beverage: Beverage) => {
    setSelectedBeverage(beverage);
    setDeleteOpen(true);
  };

  const handleSaveBeverage = (beverageData: Omit<Beverage, 'id'> & { id?: string }) => {
    if (selectedBeverage) {
      // Edit mode
      setBeverages(beverages.map(b => b.id === selectedBeverage.id ? { ...b, ...beverageData } : b));
      toast({ title: "Beverage Updated", description: `${beverageData.name} has been updated.` });
    } else {
      // Add mode
      const newBeverage: Beverage = {
        id: `bev-${Date.now()}`,
        ...beverageData,
      };
      setBeverages([...beverages, newBeverage]);
      toast({ title: "Beverage Added", description: `${newBeverage.name} has been added.` });
    }
    setAddEditOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedBeverage) {
      setBeverages(beverages.filter(b => b.id !== selectedBeverage.id));
      toast({ variant: "destructive", title: "Beverage Deleted", description: "The beverage has been removed." });
      setDeleteOpen(false);
      setSelectedBeverage(null);
    }
  };
  
  const handleRecordConsumption = (data: { playerIds: string[], beverageId: string }) => {
    const beverage = beverages.find(b => b.id === data.beverageId);
    if (!beverage) return;

    const newTransactions: Transaction[] = data.playerIds.map(playerId => ({
        id: `trx-${Date.now()}-${playerId}`,
        userId: playerId,
        amount: -beverage.price,
        description: beverage.name,
        date: new Date().toISOString(),
        relatedBeverageId: beverage.id,
    }));

    setTransactions(prev => [...prev, ...newTransactions]);

    // This is a simulation. In a real app, you'd update the player's balance in the DB.
    setPlayers(currentPlayers => {
        return currentPlayers.map(p => {
            if (data.playerIds.includes(p.id)) {
                return { ...p, balance: p.balance - beverage.price };
            }
            return p;
        });
    });

    toast({
      title: "Consumption Recorded",
      description: `${beverage.name} was recorded for ${data.playerIds.length} player(s).`,
    });
  };


  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">Beverages</h1>
             <Button onClick={() => setRecordConsumptionOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Record Consumption
            </Button>
          </div>
          
           <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">Beverage List</TabsTrigger>
                <TabsTrigger value="consumption">Consumption Log</TabsTrigger>
              </TabsList>
              <TabsContent value="list">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Available Beverages</CardTitle>
                            <CardDescription>Manage the beverages available for purchase.</CardDescription>
                        </div>
                        <Button size="sm" onClick={handleAddClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Beverage
                        </Button>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Beverage</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                             <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {beverages?.map((beverage) => (
                            <TableRow key={beverage.id}>
                            <TableCell className="font-medium">{beverage.name}</TableCell>
                            <TableCell className="text-right">€{beverage.price.toFixed(2)}</TableCell>
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
                                    <DropdownMenuItem onClick={() => handleEditClick(beverage)}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteClick(beverage)} className="text-destructive">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    {beverages?.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            No beverages found. Add one to get started.
                        </div>
                    )}
                    </CardContent>
                </Card>
              </TabsContent>
               <TabsContent value="consumption">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Consumption</CardTitle>
                        <CardDescription>A log of recently purchased beverages.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Player</TableHead>
                                    <TableHead>Beverage</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions
                                    .filter(t => t.relatedBeverageId)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .slice(0, 10) // Show last 10
                                    .map((trx) => (
                                        <TableRow key={trx.id}>
                                            <TableCell>{players.find(p => p.id === trx.userId)?.name || 'Unknown'}</TableCell>
                                            <TableCell>{trx.description}</TableCell>
                                            <TableCell>
                                                <SafeLocaleDate dateString={trx.date} options={{ hour: '2-digit', minute: '2-digit' }} />
                                            </TableCell>
                                            <TableCell className="text-right text-destructive">-€{Math.abs(trx.amount).toFixed(2)}</TableCell>
                                        </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {transactions.filter(t => t.relatedBeverageId).length === 0 && (
                            <div className="text-center p-8 text-muted-foreground">
                                No consumption recorded yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </div>
      </main>
      
      <AddEditBeverageDialog
        isOpen={isAddEditOpen}
        setOpen={setAddEditOpen}
        onSave={handleSaveBeverage}
        beverage={selectedBeverage}
      />
      <DeleteBeverageDialog
        isOpen={isDeleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        beverageName={selectedBeverage?.name}
      />
      <RecordConsumptionDialog
        isOpen={isRecordConsumptionOpen}
        setOpen={setRecordConsumptionOpen}
        players={players}
        beverages={beverages}
        onRecord={handleRecordConsumption}
       />

    </>
  );
}
