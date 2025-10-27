'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Receipt, Wallet, Beer, TrendingDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Player, Fine, Payment, Due, DuePayment, BeverageConsumption, PredefinedFine, Beverage } from '@/lib/types';
import { Stats } from '@/components/dashboard/stats';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  players as staticPlayers,
  fines as staticFines,
  payments as staticPayments,
  dues as staticDues,
  duePayments as staticDuePayments,
  beverageConsumptions as staticBeverageConsumptions,
  predefinedFines as staticPredefinedFines,
  beverages as staticBeverages
} from '@/lib/static-data';
import { AddFineDialog } from '@/components/dashboard/add-fine-dialog';
import { RecordDuePaymentDialog } from '@/components/dues/record-due-payment-dialog';
import { AddEditPaymentDialog } from '@/components/payments/add-edit-payment-dialog';
import { RecordConsumptionDialog } from '@/components/beverages/record-consumption-dialog';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { updatePlayersWithCalculatedBalances } from '@/lib/utils';

type TransactionType = 'fine' | 'payment' | 'due' | 'beverage';

interface UnifiedTransaction {
  id: string;
  date: string;
  userId: string;
  userName: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: 'paid' | 'unpaid' | 'exempt' | 'partially_paid';
  amountPaid?: number;
  totalAmount?: number;
}

export default function DashboardPage() {
  const [fines, setFines] = useState<Fine[]>(staticFines);
  const [payments, setPayments] = useState<Payment[]>(staticPayments);
  const [duePayments, setDuePayments] = useState<DuePayment[]>(staticDuePayments);
  const [beverageConsumptions, setBeverageConsumptions] = useState<BeverageConsumption[]>(staticBeverageConsumptions);
  const [dues] = useState<Due[]>(staticDues);
  const [predefinedFines] = useState<PredefinedFine[]>(staticPredefinedFines);
  const [beverages] = useState<Beverage[]>(staticBeverages);

  // Calculate player balances dynamically based on all transactions
  const players = useMemo(() => {
    return updatePlayersWithCalculatedBalances(
      staticPlayers,
      payments,
      fines,
      duePayments,
      beverageConsumptions
    );
  }, [payments, fines, duePayments, beverageConsumptions]);

  // Dialog states
  const [isAddFineOpen, setAddFineOpen] = useState(false);
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isRecordDueOpen, setRecordDueOpen] = useState(false);
  const [isRecordBeverageOpen, setRecordBeverageOpen] = useState(false);

  const { toast } = useToast();

  const getPlayerName = (id: string) => players?.find(p => p.id === id)?.name || 'Unknown';
  const getDueName = (id: string) => dues?.find(d => d.id === id)?.name || 'Unknown';

  // Convert all data sources into unified transactions
  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const transactions: UnifiedTransaction[] = [];

    fines.forEach(fine => {
      const isPartiallyPaid = !fine.paid && fine.amountPaid && fine.amountPaid > 0;
      transactions.push({
        id: fine.id,
        date: fine.date,
        userId: fine.userId,
        userName: getPlayerName(fine.userId),
        description: fine.reason,
        amount: -fine.amount,
        type: 'fine',
        status: fine.paid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid'),
        amountPaid: fine.amountPaid,
        totalAmount: fine.amount,
      });
    });

    payments.forEach(payment => {
      transactions.push({
        id: payment.id,
        date: payment.date,
        userId: payment.userId,
        userName: getPlayerName(payment.userId),
        description: payment.reason,
        amount: payment.amount,
        type: 'payment',
        status: payment.paid ? 'paid' : 'unpaid',
      });
    });

    duePayments.forEach(duePayment => {
      const isPartiallyPaid = !duePayment.paid && duePayment.amountPaid && duePayment.amountPaid > 0;
      transactions.push({
        id: duePayment.id,
        date: duePayment.createdAt,
        userId: duePayment.userId,
        userName: duePayment.userName,
        description: `Due: ${getDueName(duePayment.dueId)}`,
        amount: -duePayment.amountDue,
        type: 'due',
        status: duePayment.exempt ? 'exempt' : (duePayment.paid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid')),
        amountPaid: duePayment.amountPaid,
        totalAmount: duePayment.amountDue,
      });
    });

    beverageConsumptions.forEach(beverage => {
      const isPartiallyPaid = !beverage.paid && beverage.amountPaid && beverage.amountPaid > 0;
      transactions.push({
        id: beverage.id,
        date: beverage.date,
        userId: beverage.userId,
        userName: getPlayerName(beverage.userId),
        description: `Beverage: ${beverage.beverageName}`,
        amount: -beverage.amount,
        type: 'beverage',
        status: beverage.paid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid'),
        amountPaid: beverage.amountPaid,
        totalAmount: beverage.amount,
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fines, payments, duePayments, beverageConsumptions, players, dues]);

  // Get top 3 debtors
  const topDebtors = useMemo(() => {
    return [...players]
      .filter(p => p.balance < 0)
      .sort((a, b) => a.balance - b.balance)
      .slice(0, 3);
  }, [players]);

  // Get last 5 transactions
  const recentTransactions = useMemo(() => {
    return unifiedTransactions.slice(0, 5);
  }, [unifiedTransactions]);

  const handleAddFine = (newFineData: any) => {
    const newFines = newFineData.playerIds.map((playerId: string) => {
      const player = players.find(p => p.id === playerId);
      const playerBalance = player?.balance || 0;
      const fineAmount = newFineData.amount;

      // Determine payment status
      const hasFullCredit = playerBalance >= fineAmount;
      const hasPartialCredit = playerBalance > 0 && playerBalance < fineAmount;

      return {
        id: `fine-${Date.now()}-${playerId}`,
        userId: playerId,
        reason: newFineData.reason,
        amount: fineAmount,
        date: new Date().toISOString(),
        paid: hasFullCredit,
        paidAt: hasFullCredit ? new Date().toISOString() : undefined,
        amountPaid: hasPartialCredit ? playerBalance : (hasFullCredit ? fineAmount : undefined),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    setFines(prevFines => [...prevFines, ...newFines]);

    // Balance is now calculated automatically - no manual update needed!
    const autoPaidCount = newFines.filter((f: Fine) => f.paid).length;
    const partiallyPaidCount = newFines.filter((f: Fine) => !f.paid && f.amountPaid && f.amountPaid > 0).length;

    let description = `${newFineData.reason} assigned to ${newFineData.playerIds.length} player(s).`;
    if (autoPaidCount > 0) {
      description += ` ${autoPaidCount} automatically paid from credit.`;
    }
    if (partiallyPaidCount > 0) {
      description += ` ${partiallyPaidCount} partially paid from available credit.`;
    }

    toast({
      title: "Fine(s) Added",
      description
    });
  };

  const handleAddPayment = (paymentData: any) => {
    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      userId: paymentData.userId,
      reason: paymentData.reason,
      amount: paymentData.amount,
      date: new Date().toISOString(),
      paid: true,
      paidAt: new Date().toISOString(),
    };

    setPayments(prevPayments => [...prevPayments, newPayment]);

    // Balance is now calculated automatically - no manual update needed!

    toast({
      title: "Payment Added",
      description: `Payment of €${paymentData.amount.toFixed(2)} recorded. Player credit updated.`
    });
  };

  const handleRecordDuePayment = (data: { playerIds: string[], dueId: string, status: "paid" | "exempt" }) => {
    const due = dues.find(d => d.id === data.dueId);
    if (!due) return;

    const newPayments: DuePayment[] = data.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      const playerBalance = player?.balance || 0;
      const dueAmount = due.amount;

      // Determine payment status (unless explicitly marking as exempt)
      const hasFullCredit = playerBalance >= dueAmount;
      const hasPartialCredit = playerBalance > 0 && playerBalance < dueAmount;
      const autoPaid = data.status !== 'exempt' && hasFullCredit;

      return {
        id: `dp-${Date.now()}-${playerId}`,
        dueId: data.dueId,
        userId: playerId,
        userName: player?.name || 'Unknown',
        amountDue: dueAmount,
        paid: data.status === 'paid' || autoPaid || false,
        paidAt: (data.status === 'paid' || autoPaid) ? new Date().toISOString() : undefined,
        amountPaid: data.status !== 'exempt' && hasPartialCredit ? playerBalance : (autoPaid ? dueAmount : undefined),
        exempt: data.status === 'exempt',
        createdAt: new Date().toISOString(),
      };
    });

    setDuePayments(prevPayments => [...prevPayments, ...newPayments]);

    // Balance is now calculated automatically - no manual update needed!
    const autoPaidCount = newPayments.filter(dp => dp.paid && data.status !== 'paid' && !dp.exempt).length;
    const partiallyPaidCount = newPayments.filter(dp => !dp.paid && dp.amountPaid && dp.amountPaid > 0 && !dp.exempt).length;

    let description = `Payment recorded for ${data.playerIds.length} player(s).`;
    if (autoPaidCount > 0) {
      description += ` ${autoPaidCount} automatically paid from credit.`;
    }
    if (partiallyPaidCount > 0) {
      description += ` ${partiallyPaidCount} partially paid from available credit.`;
    }

    toast({
      title: "Payment Recorded",
      description
    });
  };

  const handleRecordBeverage = (data: { playerIds: string[], beverageId: string }) => {
    const beverage = beverages.find(b => b.id === data.beverageId);
    if (!beverage) return;

    const newConsumptions: BeverageConsumption[] = data.playerIds.map(playerId => {
      const player = players.find(p => p.id === playerId);
      const playerBalance = player?.balance || 0;
      const beveragePrice = beverage.price;

      // Determine payment status
      const hasFullCredit = playerBalance >= beveragePrice;
      const hasPartialCredit = playerBalance > 0 && playerBalance < beveragePrice;

      return {
        id: `bc-${Date.now()}-${playerId}`,
        userId: playerId,
        beverageId: beverage.id,
        beverageName: beverage.name,
        amount: beveragePrice,
        date: new Date().toISOString(),
        paid: hasFullCredit,
        paidAt: hasFullCredit ? new Date().toISOString() : undefined,
        amountPaid: hasPartialCredit ? playerBalance : (hasFullCredit ? beveragePrice : undefined),
        createdAt: new Date().toISOString(),
      };
    });

    setBeverageConsumptions(prevConsumptions => [...prevConsumptions, ...newConsumptions]);

    // Balance is now calculated automatically - no manual update needed!
    const autoPaidCount = newConsumptions.filter(bc => bc.paid).length;
    const partiallyPaidCount = newConsumptions.filter(bc => !bc.paid && bc.amountPaid && bc.amountPaid > 0).length;

    let description = `${beverage.name} recorded for ${data.playerIds.length} player(s).`;
    if (autoPaidCount > 0) {
      description += ` ${autoPaidCount} automatically paid from credit.`;
    }
    if (partiallyPaidCount > 0) {
      description += ` ${partiallyPaidCount} partially paid from available credit.`;
    }

    toast({
      title: "Beverage Recorded",
      description
    });
  };

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'fine':
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">Fine</Badge>;
      case 'payment':
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Payment</Badge>;
      case 'due':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">Due</Badge>;
      case 'beverage':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">Beverage</Badge>;
    }
  };

  return (
    <>
      <main className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-headline text-xl font-semibold md:text-2xl">
            Dashboard
          </h1>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {/* Stats Section */}
          <Stats players={players} fines={fines} />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for managing team finances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAddFineOpen(true)} variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Fine
                </Button>
                <Button onClick={() => setAddPaymentOpen(true)} variant="outline">
                  <Receipt className="mr-2 h-4 w-4" />
                  Add Payment
                </Button>
                <Button onClick={() => setRecordDueOpen(true)} variant="outline">
                  <Wallet className="mr-2 h-4 w-4" />
                  Record Due
                </Button>
                <Button onClick={() => setRecordBeverageOpen(true)} variant="outline">
                  <Beer className="mr-2 h-4 w-4" />
                  Record Beverage
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Debtors Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  Top Debtors
                </CardTitle>
                <CardDescription>Players with the highest debts</CardDescription>
              </CardHeader>
              <CardContent>
                {topDebtors.length > 0 ? (
                  <div className="space-y-4">
                    {topDebtors.map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-sm font-bold text-destructive">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{player.name}</p>
                            <p className="text-sm text-muted-foreground">{player.nickname}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-destructive">
                            €{player.balance.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No players in debt
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Widget */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 5 transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.userName}</TableCell>
                          <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                          <TableCell className={`text-right font-mono ${transaction.amount < 0 ? 'text-destructive' : 'text-positive'}`}>
                            {transaction.amount >= 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No recent activity
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <AddFineDialog
        isOpen={isAddFineOpen}
        setOpen={setAddFineOpen}
        players={players}
        predefinedFines={predefinedFines}
        onFineAdded={handleAddFine}
      />
      <AddEditPaymentDialog
        isOpen={isAddPaymentOpen}
        setOpen={setAddPaymentOpen}
        players={players}
        payment={null}
        onSave={handleAddPayment}
      />
      <RecordDuePaymentDialog
        isOpen={isRecordDueOpen}
        setOpen={setRecordDueOpen}
        players={players}
        dues={dues}
        onRecord={handleRecordDuePayment}
      />
      <RecordConsumptionDialog
        isOpen={isRecordBeverageOpen}
        setOpen={setRecordBeverageOpen}
        players={players}
        beverages={beverages}
        onRecord={handleRecordBeverage}
      />
    </>
  );
}
