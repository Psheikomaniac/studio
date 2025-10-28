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
import { usePlayers } from '@/services/players.service';
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import {
  dues as staticDues,
  predefinedFines as staticPredefinedFines,
  beverages as staticBeverages
} from '@/lib/static-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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
  // Fetch all players and their transactions from Firebase
  const { data: playersData, isLoading: playersLoading, error: playersError } = usePlayers();
  const { data: finesData, isLoading: finesLoading } = useAllFines();
  const { data: paymentsData, isLoading: paymentsLoading } = useAllPayments();
  const { data: duePaymentsData, isLoading: duePaymentsLoading } = useAllDuePayments();
  const { data: consumptionsData, isLoading: consumptionsLoading } = useAllBeverageConsumptions();

  // Keep static data for catalogs (dues, predefined fines, beverages)
  const [dues] = useState<Due[]>(staticDues);
  const [predefinedFines] = useState<PredefinedFine[]>(staticPredefinedFines);
  const [beverages] = useState<Beverage[]>(staticBeverages);

  // Use Firebase data or empty arrays while loading
  const fines = finesData || [];
  const payments = paymentsData || [];
  const duePayments = duePaymentsData || [];
  const beverageConsumptions = consumptionsData || [];

  // Calculate player balances dynamically based on all transactions
  const players = useMemo(() => {
    if (!playersData) return [];

    return updatePlayersWithCalculatedBalances(
      playersData,
      payments,
      fines,
      duePayments,
      beverageConsumptions
    );
  }, [playersData, payments, fines, duePayments, beverageConsumptions]);

  // Determine overall loading state
  const isLoading = playersLoading || finesLoading || paymentsLoading ||
                    duePaymentsLoading || consumptionsLoading;

  // Dialog states
  const [isAddFineOpen, setAddFineOpen] = useState(false);
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isRecordDueOpen, setRecordDueOpen] = useState(false);
  const [isRecordBeverageOpen, setRecordBeverageOpen] = useState(false);

  const { toast } = useToast();

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  const getDueName = (id: string) => dues.find(d => d.id === id)?.name || 'Unknown';

  // Show loading state
  if (isLoading) {
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
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Show error state
  if (playersError) {
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
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Dashboard</AlertTitle>
              <AlertDescription>
                {playersError.message || 'Failed to load dashboard data. Please try again later.'}
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </>
    );
  }

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

  // Note: Dialog handlers removed - dialogs now handle Firebase operations directly
  // Real-time listeners will automatically update the UI when data changes

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

      {/* Dialogs - handlers removed, they now use Firebase services directly */}
      <AddFineDialog
        isOpen={isAddFineOpen}
        setOpen={setAddFineOpen}
        players={players}
        predefinedFines={predefinedFines}
        onFineAdded={() => {}} // Kept for backwards compatibility
      />
      <AddEditPaymentDialog
        isOpen={isAddPaymentOpen}
        setOpen={setAddPaymentOpen}
        players={players}
        payment={null}
        onSave={() => {}} // Kept for backwards compatibility
      />
      <RecordDuePaymentDialog
        isOpen={isRecordDueOpen}
        setOpen={setRecordDueOpen}
        players={players}
        dues={dues}
        onRecord={() => {}} // Kept for backwards compatibility
      />
      <RecordConsumptionDialog
        isOpen={isRecordBeverageOpen}
        setOpen={setRecordBeverageOpen}
        players={players}
        beverages={beverages}
        onRecord={() => {}} // Kept for backwards compatibility
      />
    </>
  );
}
