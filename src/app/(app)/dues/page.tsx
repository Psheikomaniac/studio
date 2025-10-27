
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Receipt } from "lucide-react";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from "@/hooks/use-toast";
import type { Due, DuePayment, Player } from "@/lib/types";
import { dues as staticDues, duePayments as staticDuePayments, players as staticPlayers } from '@/lib/static-data';
import { AddEditDueDialog } from '@/components/dues/add-edit-due-dialog';
import { RecordDuePaymentDialog } from '@/components/dues/record-due-payment-dialog';
import { DeleteDueDialog } from '@/components/dues/delete-due-dialog';
import { DuePaymentsTable } from '@/components/dues/due-payments-table';

export default function DuesPage() {
  const [dues, setDues] = useState<Due[]>(staticDues);
  const [duePayments, setDuePayments] = useState<DuePayment[]>(staticDuePayments);
  const [players] = useState<Player[]>(staticPlayers);

  const [isAddDueOpen, setAddDueOpen] = useState(false);
  const [isEditDueOpen, setEditDueOpen] = useState(false);
  const [isDeleteDueOpen, setDeleteDueOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<Due | null>(null);

  const { toast } = useToast();

  const handleAddDue = (dueData: any) => {
    const newDue: Due = {
      id: `due-${Date.now()}`,
      name: dueData.name,
      amount: dueData.amount,
      archived: dueData.archived,
      active: !dueData.archived,
      createdAt: new Date().toISOString(),
    };

    setDues(prevDues => [...prevDues, newDue]);
    toast({
      title: "Due Added",
      description: `${dueData.name} has been added successfully.`
    });
    setAddDueOpen(false);
  };

  const handleEditClick = (due: Due) => {
    setSelectedDue(due);
    setEditDueOpen(true);
  };

  const handleSaveDue = (dueData: any) => {
    if (selectedDue) {
      setDues(dues.map(d => d.id === selectedDue.id ? {
        ...d,
        name: dueData.name,
        amount: dueData.amount,
        archived: dueData.archived,
        active: !dueData.archived,
      } : d));
      toast({ title: "Due Updated", description: "The due details have been updated." });
      setEditDueOpen(false);
      setSelectedDue(null);
    }
  };

  const handleDeleteClick = (due: Due) => {
    setSelectedDue(due);
    setDeleteDueOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedDue) {
      setDues(dues.filter(d => d.id !== selectedDue.id));
      setDuePayments(duePayments.filter(dp => dp.dueId !== selectedDue.id));
      toast({ variant: "destructive", title: "Due Deleted", description: "The due and all associated payments have been removed." });
      setDeleteDueOpen(false);
      setSelectedDue(null);
    }
  };

  const handleRecordPayment = (data: { playerIds: string[], dueId: string, status: "paid" | "exempt" }) => {
    const due = dues.find(d => d.id === data.dueId);
    if (!due) return;

    const newPayments: DuePayment[] = data.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return {
        id: `dp-${Date.now()}-${playerId}`,
        dueId: data.dueId,
        userId: playerId,
        userName: player?.name || 'Unknown',
        amountDue: due.amount,
        paid: data.status === 'paid',
        paidAt: data.status === 'paid' ? new Date().toISOString() : undefined,
        exempt: data.status === 'exempt',
        createdAt: new Date().toISOString(),
      };
    });

    setDuePayments(prevPayments => [...prevPayments, ...newPayments]);
    toast({
      title: "Payment Recorded",
      description: `Payment recorded for ${data.playerIds.length} player(s).`
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    setDuePayments(duePayments.filter(dp => dp.id !== paymentId));
    toast({ variant: "destructive", title: "Payment Deleted", description: "The payment record has been removed." });
  };

  const handleTogglePaymentStatus = (paymentId: string, newStatus: 'paid' | 'exempt' | 'pending') => {
    setDuePayments(duePayments.map(dp => {
      if (dp.id === paymentId) {
        return {
          ...dp,
          paid: newStatus === 'paid',
          paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
          exempt: newStatus === 'exempt',
        };
      }
      return dp;
    }));
    toast({ title: "Status Updated", description: `Payment marked as ${newStatus}.` });
  };

  const getDuePaymentStats = (dueId: string) => {
    const payments = duePayments.filter(dp => dp.dueId === dueId);
    const paidCount = payments.filter(p => p.paid).length;
    const exemptCount = payments.filter(p => p.exempt).length;
    const pendingCount = payments.filter(p => !p.paid && !p.exempt).length;
    return { total: payments.length, paid: paidCount, exempt: exemptCount, pending: pendingCount };
  };

  const hasPayments = (dueId: string) => duePayments.some(dp => dp.dueId === dueId);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">Dues</h1>
            <div className="flex gap-2">
              <Button onClick={() => setRecordPaymentOpen(true)} variant="outline">
                <Receipt className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
              <Button onClick={() => setAddDueOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Due
              </Button>
            </div>
          </div>

          <Tabs defaultValue="dues" className="w-full">
            <TabsList>
              <TabsTrigger value="dues">Dues</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="dues">
              <Card>
                <CardHeader>
                  <CardTitle>All Dues</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dues?.map((due) => {
                        const stats = getDuePaymentStats(due.id);
                        return (
                          <TableRow key={due.id}>
                            <TableCell className="font-medium">{due.name}</TableCell>
                            <TableCell className="text-right">€{due.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {due.archived ? (
                                <Badge variant="outline" className="text-muted-foreground border-muted">
                                  Archived
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-positive border-positive/50">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {stats.total > 0 ? (
                                <span className="text-sm text-muted-foreground">
                                  {stats.paid} paid, {stats.exempt} exempt, {stats.pending} pending
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">No payments</span>
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
                                  <DropdownMenuItem onClick={() => handleEditClick(due)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteClick(due)} className="text-destructive">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {dues?.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                      No dues found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <DuePaymentsTable
                    duePayments={duePayments}
                    dues={dues}
                    players={players}
                    onDelete={handleDeletePayment}
                    onToggleStatus={handleTogglePaymentStatus}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <AddEditDueDialog
        isOpen={isAddDueOpen}
        setOpen={setAddDueOpen}
        onSave={handleAddDue}
        due={null}
      />
      <AddEditDueDialog
        isOpen={isEditDueOpen}
        setOpen={setEditDueOpen}
        onSave={handleSaveDue}
        due={selectedDue}
      />
      <RecordDuePaymentDialog
        isOpen={isRecordPaymentOpen}
        setOpen={setRecordPaymentOpen}
        players={players}
        dues={dues}
        onRecord={handleRecordPayment}
      />
      <DeleteDueDialog
        isOpen={isDeleteDueOpen}
        setOpen={setDeleteDueOpen}
        onConfirm={handleDeleteConfirm}
        dueName={selectedDue?.name}
        hasPayments={selectedDue ? hasPayments(selectedDue.id) : false}
      />
    </>
  );
}
