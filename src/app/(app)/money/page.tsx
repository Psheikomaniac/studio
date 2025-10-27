'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Receipt, Wallet, Beer, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, Fine, Payment, Due, DuePayment, BeverageConsumption, PredefinedFine, Beverage } from "@/lib/types";
import {
  fines as staticFines,
  payments as staticPayments,
  players as staticPlayers,
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

type TransactionType = 'fine' | 'payment' | 'due' | 'beverage';

interface UnifiedTransaction {
  id: string;
  date: string;
  userId: string;
  userName: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: 'paid' | 'unpaid' | 'exempt';
  paidAt?: string;
}

export default function MoneyPage() {
  const [fines, setFines] = useState<Fine[]>(staticFines);
  const [payments, setPayments] = useState<Payment[]>(staticPayments);
  const [duePayments, setDuePayments] = useState<DuePayment[]>(staticDuePayments);
  const [beverageConsumptions, setBeverageConsumptions] = useState<BeverageConsumption[]>(staticBeverageConsumptions);
  const [players] = useState<Player[]>(staticPlayers);
  const [dues] = useState<Due[]>(staticDues);
  const [predefinedFines] = useState<PredefinedFine[]>(staticPredefinedFines);
  const [beverages] = useState<Beverage[]>(staticBeverages);

  // Dialog states
  const [isAddFineOpen, setAddFineOpen] = useState(false);
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isRecordDueOpen, setRecordDueOpen] = useState(false);
  const [isRecordBeverageOpen, setRecordBeverageOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPlayer, setFilterPlayer] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { toast } = useToast();

  const getPlayerName = (id: string) => players?.find(p => p.id === id)?.name || 'Unknown';
  const getDueName = (id: string) => dues?.find(d => d.id === id)?.name || 'Unknown';

  // Convert all data sources into unified transactions
  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const transactions: UnifiedTransaction[] = [];

    // Fines (debit)
    fines.forEach(fine => {
      transactions.push({
        id: fine.id,
        date: fine.date,
        userId: fine.userId,
        userName: getPlayerName(fine.userId),
        description: fine.reason,
        amount: -fine.amount, // negative for debit
        type: 'fine',
        status: fine.paid ? 'paid' : 'unpaid',
        paidAt: fine.paidAt,
      });
    });

    // Payments (credit)
    payments.forEach(payment => {
      transactions.push({
        id: payment.id,
        date: payment.date,
        userId: payment.userId,
        userName: getPlayerName(payment.userId),
        description: payment.reason,
        amount: payment.amount, // positive for credit
        type: 'payment',
        status: payment.paid ? 'paid' : 'unpaid',
        paidAt: payment.paidAt,
      });
    });

    // Due Payments (debit)
    duePayments.forEach(duePayment => {
      const due = dues.find(d => d.id === duePayment.dueId);
      transactions.push({
        id: duePayment.id,
        date: duePayment.createdAt,
        userId: duePayment.userId,
        userName: duePayment.userName,
        description: `Due: ${getDueName(duePayment.dueId)}`,
        amount: -duePayment.amountDue, // negative for debit
        type: 'due',
        status: duePayment.exempt ? 'exempt' : (duePayment.paid ? 'paid' : 'unpaid'),
        paidAt: duePayment.paidAt,
      });
    });

    // Beverage Consumptions (debit)
    beverageConsumptions.forEach(beverage => {
      transactions.push({
        id: beverage.id,
        date: beverage.date,
        userId: beverage.userId,
        userName: getPlayerName(beverage.userId),
        description: `Beverage: ${beverage.beverageName}`,
        amount: -beverage.amount, // negative for debit
        type: 'beverage',
        status: beverage.paid ? 'paid' : 'unpaid',
        paidAt: beverage.paidAt,
      });
    });

    // Sort by date descending (newest first)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fines, payments, duePayments, beverageConsumptions, players, dues]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter(transaction => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          transaction.userName.toLowerCase().includes(query) ||
          transaction.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filterType !== 'all' && transaction.type !== filterType) {
        return false;
      }

      // Player filter
      if (filterPlayer !== 'all' && transaction.userId !== filterPlayer) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'all' && transaction.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [unifiedTransactions, searchQuery, filterType, filterPlayer, filterStatus]);

  // Calculate totals
  const totals = useMemo(() => {
    const filtered = filteredTransactions;
    return {
      totalDebits: filtered.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      totalCredits: filtered.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      netBalance: filtered.reduce((sum, t) => sum + t.amount, 0),
    };
  }, [filteredTransactions]);

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
    toast({
      title: "Payment Added",
      description: `Payment of €${paymentData.amount.toFixed(2)} recorded.`
    });
  };

  const handleRecordDuePayment = (data: { playerIds: string[], dueId: string, status: "paid" | "exempt" }) => {
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

  const handleRecordBeverage = (data: { playerIds: string[], beverageId: string }) => {
    const beverage = beverages.find(b => b.id === data.beverageId);
    if (!beverage) return;

    const newConsumptions: BeverageConsumption[] = data.playerIds.map(playerId => ({
      id: `bc-${Date.now()}-${playerId}`,
      userId: playerId,
      beverageId: beverage.id,
      beverageName: beverage.name,
      amount: beverage.price,
      date: new Date().toISOString(),
      paid: false,
      createdAt: new Date().toISOString(),
    }));

    setBeverageConsumptions(prevConsumptions => [...prevConsumptions, ...newConsumptions]);
    toast({
      title: "Beverage Recorded",
      description: `${beverage.name} recorded for ${data.playerIds.length} player(s).`
    });
  };

  const handleToggleStatus = (transaction: UnifiedTransaction) => {
    // Payment status can't be toggled (always paid)
    if (transaction.type === 'payment') {
      toast({
        title: "Cannot Toggle",
        description: "Payment status cannot be changed.",
        variant: "destructive"
      });
      return;
    }

    // Exempt status can't be toggled
    if (transaction.status === 'exempt') {
      toast({
        title: "Cannot Toggle",
        description: "Exempt status cannot be changed to paid/unpaid.",
        variant: "destructive"
      });
      return;
    }

    const newStatus = transaction.status === 'paid' ? 'unpaid' : 'paid';

    // Update based on transaction type
    switch (transaction.type) {
      case 'fine':
        setFines(fines.map(f =>
          f.id === transaction.id
            ? {
                ...f,
                paid: newStatus === 'paid',
                paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined
              }
            : f
        ));
        break;

      case 'due':
        setDuePayments(duePayments.map(dp =>
          dp.id === transaction.id
            ? {
                ...dp,
                paid: newStatus === 'paid',
                paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined
              }
            : dp
        ));
        break;

      case 'beverage':
        setBeverageConsumptions(beverageConsumptions.map(bc =>
          bc.id === transaction.id
            ? {
                ...bc,
                paid: newStatus === 'paid',
                paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined
              }
            : bc
        ));
        break;
    }

    toast({
      title: "Status Updated",
      description: `Transaction marked as ${newStatus}.`
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterPlayer('all');
    setFilterStatus('all');
  };

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterPlayer !== 'all' || filterStatus !== 'all';

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

  const getStatusBadge = (transaction: UnifiedTransaction) => {
    const isClickable = transaction.type !== 'payment' && transaction.status !== 'exempt';
    const baseClass = isClickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : '';

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isClickable) {
        handleToggleStatus(transaction);
      }
    };

    switch (transaction.status) {
      case 'paid':
        return (
          <Badge
            variant="outline"
            className={`text-positive border-positive/50 ${baseClass}`}
            onClick={handleClick}
          >
            Paid
          </Badge>
        );
      case 'exempt':
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground border-muted"
          >
            Exempt
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge
            variant="destructive"
            className={`bg-destructive/10 text-destructive border-destructive/20 ${baseClass}`}
            onClick={handleClick}
          >
            Unpaid
          </Badge>
        );
    }
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">Money</h1>
            <div className="flex gap-2">
              <Button onClick={() => setAddFineOpen(true)} variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Fine
              </Button>
              <Button onClick={() => setAddPaymentOpen(true)} variant="outline" size="sm">
                <Receipt className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
              <Button onClick={() => setRecordDueOpen(true)} variant="outline" size="sm">
                <Wallet className="mr-2 h-4 w-4" />
                Record Due
              </Button>
              <Button onClick={() => setRecordBeverageOpen(true)} variant="outline" size="sm">
                <Beer className="mr-2 h-4 w-4" />
                Record Beverage
              </Button>
            </div>
          </div>

          {/* Filter Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search player or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="fine">Fine</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPlayer} onValueChange={setFilterPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length} of {unifiedTransactions.length} transactions
                  </p>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">-€{totals.totalDebits.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-positive">+€{totals.totalCredits.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totals.netBalance < 0 ? 'text-destructive' : 'text-positive'}`}>
                  {totals.netBalance >= 0 ? '+' : ''}€{totals.netBalance.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <SafeLocaleDate dateString={transaction.date} />
                      </TableCell>
                      <TableCell className="font-medium">{transaction.userName}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                      <TableCell className={`text-right font-mono ${transaction.amount < 0 ? 'text-destructive' : 'text-positive'}`}>
                        {transaction.amount >= 0 ? '+' : ''}€{transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredTransactions.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  {hasActiveFilters ? 'No transactions match your filters.' : 'No transactions found.'}
                </div>
              )}
            </CardContent>
          </Card>
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
