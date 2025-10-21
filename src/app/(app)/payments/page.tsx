
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MoreHorizontal, PlusCircle, CreditCard } from "lucide-react";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Payment, Player } from "@/lib/types";
import { payments as staticPayments, players as staticPlayers } from '@/lib/static-data';
import { useToast } from "@/hooks/use-toast";
import { AddEditPaymentDialog } from '@/components/payments/add-edit-payment-dialog';
import { DeletePaymentDialog } from '@/components/payments/delete-payment-dialog';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(staticPayments);
  const [players] = useState<Player[]>(staticPlayers);
  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { toast } = useToast();

  const getPlayerName = (id: string) => players?.find(p => p.id === id)?.name || 'Unknown';

  const handleAddClick = () => {
    setSelectedPayment(null);
    setAddEditDialogOpen(true);
  };

  const handleEditClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setAddEditDialogOpen(true);
  };
  
  const handleDeleteClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteDialogOpen(true);
  };

  const handleSavePayment = (paymentData: Omit<Payment, 'id' | 'paid' | 'paidAt' | 'date'> & { id?: string }) => {
    if (selectedPayment) {
      // Edit mode
      setPayments(payments.map(p => p.id === selectedPayment.id ? { ...p, ...paymentData } : p));
      toast({ title: "Payment Updated", description: `${paymentData.reason} has been updated.` });
    } else {
      // Add mode
      const newPayment: Payment = {
        id: `payment-${Date.now()}`,
        ...paymentData,
        date: new Date().toISOString(),
        paid: false,
      };
      setPayments([...payments, newPayment]);
      toast({ title: "Payment Added", description: `${newPayment.reason} has been added.` });
    }
    setAddEditDialogOpen(false);
  };

  const handleMarkAsPaid = (paymentId: string) => {
    setPayments(payments.map(p => p.id === paymentId ? { ...p, paid: true, paidAt: new Date().toISOString() } : p));
    toast({ title: "Payment Paid", description: "The payment has been marked as paid." });
  };

  const handleDeleteConfirm = () => {
    if (selectedPayment) {
      setPayments(payments.filter(p => p.id !== selectedPayment.id));
      toast({ variant: "destructive", title: "Payment Deleted", description: "The payment has been removed." });
      setDeleteDialogOpen(false);
      setSelectedPayment(null);
    }
  };


  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
           <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">One-Time Payments</h1>
            <Button onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
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
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.reason}</TableCell>
                      <TableCell>{payment.userId ? getPlayerName(payment.userId) : 'N/A'}</TableCell>
                      <TableCell className="text-right">€{payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {payment.paid ? (
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
                               {!payment.paid && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(payment.id)}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Mark as paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEditClick(payment)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(payment)} className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payments?.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                      No payments found.
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <AddEditPaymentDialog
        isOpen={isAddEditDialogOpen}
        setOpen={setAddEditDialogOpen}
        onSave={handleSavePayment}
        payment={selectedPayment}
        players={players}
      />
      <DeletePaymentDialog
        isOpen={isDeleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        paymentReason={selectedPayment?.reason}
      />
    </>
  );
}
