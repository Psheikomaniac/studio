'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Receipt, Wallet, Beer, Search, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player, Fine, Payment, Due, DuePayment, BeverageConsumption, PredefinedFine, Beverage } from "@/lib/types";
import { usePlayers } from '@/services/players.service';
import { useMemoFirebase, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { FinesService } from '@/services/fines.service';
import { DuesService } from '@/services/dues.service';
import { BeveragesService } from '@/services/beverages.service';
import {
  dues as staticDues,
  predefinedFines as staticPredefinedFines,
  beverages as staticBeverages
} from '@/lib/static-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AddFineDialog } from '@/components/dashboard/add-fine-dialog';
import { RecordDuePaymentDialog } from '@/components/dues/record-due-payment-dialog';
import { AddEditPaymentDialog } from '@/components/payments/add-edit-payment-dialog';
import { RecordConsumptionDialog } from '@/components/beverages/record-consumption-dialog';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { updatePlayersWithCalculatedBalances } from '@/lib/utils';
import { formatEuro } from '@/lib/csv-utils';
import { sumPaymentsToday, sumPaymentsInLastDays, computeARPPU, computeOpenFinesTotal, groupPaymentsByDay, maxDateFromCollections, movingAverage, buildFirstPayersAndCumulativeRevenueByMonth } from '@/lib/stats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider as UiTooltipProvider, TooltipTrigger as UiTooltipTrigger } from '@/components/ui/tooltip';

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
  paidAt?: string | null;
  amountPaid?: number | null;
  totalAmount?: number | null;
}

export default function MoneyPage() {
  // Get Firebase instance (optional - may be null during SSR or if Firebase is disabled)
  const firebase = useFirebaseOptional();
  const firestore = firebase?.firestore;

  // Pagination state (client-side only; fetch full datasets for stable counts)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Fetch all players and their transactions from Firebase (no per-page limits)
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

  // Load dues metadata to filter archived/inactive dues
  const duesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'dues');
  }, [firestore]);
  const { data: duesMeta } = useCollection<Due>(duesQuery);
  const dueById = useMemo(() => {
    const m = new Map<string, Due>();
    (duesMeta || []).forEach(d => m.set(d.id, d));
    return m;
  }, [duesMeta]);

  // Filter due payments to only include non-archived and active dues
  const filteredDuePayments = useMemo(() => {
    if (!dueById.size) return duePayments; // if not loaded yet, fallback to all
    return (duePayments || []).filter(dp => {
      const meta = dueById.get(dp.dueId);
      return meta ? (!meta.archived && meta.active !== false) : false;
    });
  }, [duePayments, dueById]);

  // Calculate player balances dynamically based on all transactions
  const players = useMemo(() => {
    if (!playersData) return [];

    return updatePlayersWithCalculatedBalances(
      playersData,
      payments,
      fines,
      filteredDuePayments,
      beverageConsumptions
    );
  }, [playersData, payments, fines, filteredDuePayments, beverageConsumptions]);

  // Determine overall loading state
  const isLoading = playersLoading || finesLoading || paymentsLoading ||
                    duePaymentsLoading || consumptionsLoading;

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

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  const getDueName = (id: string) => dues.find(d => d.id === id)?.name || 'Unknown';

  // Note: Loading and error UI are handled via conditional rendering in the JSX below to keep hook order stable.

  // Convert all data sources into unified transactions
  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const transactions: UnifiedTransaction[] = [];

    // Fines (debit)
    fines.forEach(fine => {
      const isPartiallyPaid = !fine.paid && fine.amountPaid && fine.amountPaid > 0;
      transactions.push({
        id: fine.id,
        date: fine.date,
        userId: fine.userId,
        userName: getPlayerName(fine.userId),
        description: fine.reason,
        amount: -fine.amount, // negative for debit
        type: 'fine',
        status: fine.paid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid'),
        paidAt: fine.paidAt,
        amountPaid: fine.amountPaid,
        totalAmount: fine.amount,
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
      const isPartiallyPaid = !duePayment.paid && duePayment.amountPaid && duePayment.amountPaid > 0;
      transactions.push({
        id: duePayment.id,
        date: duePayment.createdAt,
        userId: duePayment.userId,
        userName: duePayment.userName,
        description: `Due: ${getDueName(duePayment.dueId)}`,
        amount: -duePayment.amountDue, // negative for debit
        type: 'due',
        status: duePayment.exempt ? 'exempt' : (duePayment.paid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid')),
        paidAt: duePayment.paidAt,
        amountPaid: duePayment.amountPaid,
        totalAmount: duePayment.amountDue,
      });
    });

    // Beverage Consumptions (debit)
    beverageConsumptions.forEach(beverage => {
      const isPartiallyPaid = !beverage.paid && beverage.amountPaid && beverage.amountPaid > 0;
      transactions.push({
        id: beverage.id,
        date: beverage.date,
        userId: beverage.userId,
        userName: getPlayerName(beverage.userId),
        description: `Beverage: ${beverage.beverageName}`,
        amount: -beverage.amount, // negative for debit
        type: 'beverage',
        status: beverage.paid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid'),
        paidAt: beverage.paidAt,
        amountPaid: beverage.amountPaid,
        totalAmount: beverage.amount,
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

  const totalItems = filteredTransactions.length;


  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems, pageSize]);

  // Clamp current page if it exceeds total pages (e.g., after filtering)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Reset to first page when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterPlayer, filterStatus, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedTransactions = useMemo(() =>
    filteredTransactions.slice(startIndex, endIndex)
  , [filteredTransactions, startIndex, endIndex]);

  // Calculate totals
  const totals = useMemo(() => {
    const filtered = filteredTransactions;
    return {
      totalDebits: filtered.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      totalCredits: filtered.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
      netBalance: filtered.reduce((sum, t) => sum + t.amount, 0),
    };
  }, [filteredTransactions]);

  // Breakdown of credits by type (Guthaben vs Guthaben Rest) based on current filters
  const creditsBreakdown = useMemo(() => {
    let guthaben = 0;
    let guthabenRest = 0;
    for (const t of filteredTransactions) {
      if (t.type !== 'payment') continue;
      if (t.amount <= 0) continue; // only credits
      const r = (t.description || '').trim().toLowerCase();
      if (r === 'guthaben') guthaben += Number(t.amount) || 0;
      else if (r === 'guthaben rest') guthabenRest += Number(t.amount) || 0;
    }
    return { guthaben, guthabenRest, total: guthaben + guthabenRest };
  }, [filteredTransactions]);

  // KPIs and chart data (Money page stats)
  const revenueToday = useMemo(() => sumPaymentsToday(payments), [payments]);
  const revenue7d = useMemo(() => sumPaymentsInLastDays(payments, 7), [payments]);
  const revenue28d = useMemo(() => sumPaymentsInLastDays(payments, 28), [payments]);
  const arppu28d = useMemo(() => computeARPPU(payments, 28), [payments]);
  const openFinesTotal = useMemo(() => computeOpenFinesTotal(fines), [fines]);

  const duesTotals = useMemo(() => {
    let paid = 0;
    let outstanding = 0;
    for (const d of duePayments) {
      if (!d) continue;
      if (d.exempt) continue; // ignore exempt items for both KPIs
      const due = Number(d.amountDue) || 0;
      const paidAmt = Number(d.amountPaid || 0);
      if (d.paid) {
        paid += paidAmt || due; // treat fully-paid with missing amountPaid as amountDue
      } else {
        paid += paidAmt; // partial payments count toward "Paid"
        const rem = Math.max(0, due - paidAmt);
        outstanding += rem;
      }
    }
    return { paid, outstanding };
  }, [duePayments]);

  const paymentsSeries28d = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 27); // inclusive, 28 days window
    return groupPaymentsByDay(payments, start, end);
  }, [payments]);

  const paymentsSeries28dWithMA = useMemo(() => {
    const ma = movingAverage(paymentsSeries28d, 7);
    return paymentsSeries28d.map((p, i) => ({ ...p, ma7: ma[i]?.value ?? null }));
  }, [paymentsSeries28d]);

  const monthlyCohorts = useMemo(() => buildFirstPayersAndCumulativeRevenueByMonth(payments), [payments]);

  const lastDataDate = useMemo(() => {
    return maxDateFromCollections([payments, fines, duePayments, beverageConsumptions]);
  }, [payments, fines, duePayments, beverageConsumptions]);

  const topPayersThisMonth = useMemo(() => {
    // Sum payments per user for current calendar month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = now;
    const sums = new Map<string, number>();
    for (const p of payments) {
      if (!p?.date || typeof p.amount !== 'number') continue;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) continue;
      if (d < start || d > end) continue;
      const key = p.userId || 'unknown';
      sums.set(key, (sums.get(key) ?? 0) + (Number(p.amount) || 0));
    }
    const items = [...sums.entries()].map(([userId, total]) => ({ userId, userName: getPlayerName(userId), total }));
    return items.sort((a, b) => b.total - a.total).slice(0, 5);
  }, [payments, players]);

  const topOpenFinesByPlayer = useMemo(() => {
    // Compute total open fines (unpaid or partially paid) per user
    const openByUser = new Map<string, number>();
    for (const f of fines) {
      if (!f) continue;
      const amount = Number(f.amount) || 0;
      const paidAmount = Number(f.amountPaid || 0) || 0;
      const remaining = f.paid ? 0 : Math.max(0, amount - paidAmount);
      if (remaining <= 0) continue;
      const key = f.userId || 'unknown';
      openByUser.set(key, (openByUser.get(key) ?? 0) + remaining);
    }
    const items = [...openByUser.entries()].map(([userId, total]) => ({ userId, userName: getPlayerName(userId), total }));
    return items.sort((a, b) => b.total - a.total).slice(0, 10);
  }, [fines, players]);

  // Note: Dialog handlers removed - dialogs now handle Firebase operations directly
  // Real-time listeners will automatically update the UI when data changes

  const handleToggleStatus = async (transaction: UnifiedTransaction) => {
    // Check if Firebase is available
    if (!firestore) {
      toast({
        title: "Firebase Not Available",
        description: "Cannot update transaction status without Firebase connection.",
        variant: "destructive"
      });
      return;
    }

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

    // For partially paid, always mark as fully paid (don't toggle back to unpaid)
    const newStatus = transaction.status === 'paid' ? false : true;

    try {
      // Update based on transaction type using Firebase services
      switch (transaction.type) {
        case 'fine': {
          const finesService = new FinesService(firestore, transaction.userId);
          await finesService.toggleFinePaid(transaction.id, newStatus);
          break;
        }

        case 'due': {
          const duesService = new DuesService(firestore, transaction.userId);
          await duesService.toggleDuePaid(transaction.id, newStatus);
          break;
        }

        case 'beverage': {
          const beveragesService = new BeveragesService(firestore, transaction.userId);
          await beveragesService.toggleConsumptionPaid(transaction.id, newStatus);
          break;
        }
      }

      toast({
        title: "Status Updated",
        description: `Transaction marked as ${newStatus ? 'paid' : 'unpaid'}.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update transaction status',
        variant: "destructive"
      });
    }
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
      case 'partially_paid':
        const amountPaid = transaction.amountPaid || 0;
        const totalAmount = transaction.totalAmount || 0;
        const remaining = totalAmount - amountPaid;
        return (
          <Badge
            variant="outline"
            className={`bg-amber-50 text-amber-700 border-amber-300 ${baseClass}`}
            onClick={handleClick}
            title={`${formatEuro(remaining)} remaining`}
          >
            Partially Paid ({formatEuro(amountPaid)} / {formatEuro(totalAmount)})
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
        {playersError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Transactions</AlertTitle>
            <AlertDescription>
              {playersError.message || 'Failed to load transaction data. Please try again later.'}
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-48" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-32" />
                ))}
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h1 className="font-headline text-3xl font-bold">Money</h1>
              <div className="flex flex-wrap gap-2">
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
                    <SelectTrigger suppressHydrationWarning>
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
                    <SelectTrigger suppressHydrationWarning>
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
                    <SelectTrigger suppressHydrationWarning>
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

            {/* Data Freshness */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>
                Last data update: {lastDataDate ? <SafeLocaleDate dateString={lastDataDate} /> : 'Unknown'}
              </p>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-positive">{formatEuro(revenueToday)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue 7d</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-positive">{formatEuro(revenue7d)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue 28d</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-positive">{formatEuro(revenue28d)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Open Fines (Total)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatEuro(openFinesTotal)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">ARPPU (28d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatEuro(arppu28d)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Dues KPIs */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Dues Paid (Total)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-positive">{formatEuro(duesTotals.paid)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Dues Outstanding (Total)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatEuro(duesTotals.outstanding)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart + Top Payers */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Day (last 28 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentsSeries28d.length > 0 ? (
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={paymentsSeries28dWithMA} margin={{ left: 12, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                          <YAxis tickFormatter={(v) => `€${v}`} />
                          <Tooltip formatter={(v:number) => formatEuro(v as number)} labelFormatter={(l) => new Date(l as string).toLocaleDateString()} />
                          <Line type="monotone" dataKey="value" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="ma7" name="7d MA" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payments available to chart.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Top Payers (This Month)</CardTitle>
                </CardHeader>
                <CardContent>
                  {topPayersThisMonth.length > 0 ? (
                    <div className="space-y-3">
                      {topPayersThisMonth.map((p) => (
                        <div key={p.userId} className="flex items-center justify-between">
                          <Link href={`/players/${p.userId}`} className="hover:underline">{p.userName}</Link>
                          <div className="font-mono">{formatEuro(p.total)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payers this month yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cohorts: First Payers & Cumulative Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>First Payers & Cumulative Revenue (Monthly)</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyCohorts.length > 0 ? (
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyCohorts} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" tickFormatter={(v) => `${v}`} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(value: number, name) => name === 'Cumulative Revenue' ? formatEuro(value as number) : (value as number)} />
                        <Bar yAxisId="left" dataKey="firstPayers" name="First Payers" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="cumulativeRevenue" name="Cumulative Revenue" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No cohorts to display yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Open Fines by Player */}
            <Card>
              <CardHeader>
                <CardTitle>Top Open Fines (Players)</CardTitle>
              </CardHeader>
              <CardContent>
                {topOpenFinesByPlayer.length > 0 ? (
                  <div className="space-y-3">
                    {topOpenFinesByPlayer.map((p) => (
                      <div key={p.userId} className="flex items-center justify-between">
                        <Link href={`/players/${p.userId}`} className="hover:underline">{p.userName}</Link>
                        <div className="font-mono text-destructive">{formatEuro(p.total)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No open fines at the moment.</p>
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
                  <div className="text-2xl font-bold text-destructive">{formatEuro(totals.totalDebits)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <UiTooltipProvider delayDuration={0}>
                    <UiTooltip>
                      <UiTooltipTrigger asChild>
                        <div className="text-2xl font-bold text-positive">{formatEuro(totals.totalCredits)}</div>
                      </UiTooltipTrigger>
                      <UiTooltipContent side="top" align="end">
                        <div className="text-xs">
                          <div className="font-medium mb-1">Credits-Aufschlüsselung</div>
                          <div className="font-mono">Guthaben: {formatEuro(creditsBreakdown.guthaben)} • Guthaben Rest: {formatEuro(creditsBreakdown.guthabenRest)}</div>
                        </div>
                      </UiTooltipContent>
                    </UiTooltip>
                  </UiTooltipProvider>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totals.netBalance < 0 ? 'text-destructive' : 'text-positive'}`}>
                    {formatEuro(Math.abs(totals.netBalance))}
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
                <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Player</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          <SafeLocaleDate dateString={transaction.date} />
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap"><Link href={`/players/${transaction.userId}`} className="hover:underline">{transaction.userName}</Link></TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="whitespace-nowrap">{getTypeBadge(transaction.type)}</TableCell>
                        <TableCell className={`text-right font-mono whitespace-nowrap ${transaction.amount < 0 ? 'text-destructive' : 'text-positive'}`}>
                          {formatEuro(Math.abs(transaction.amount))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(transaction)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                {filteredTransactions.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                    {hasActiveFilters ? 'No transactions match your filters.' : 'No transactions found.'}
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page:</span>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="h-8 w-[84px]" suppressHydrationWarning>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="75">75</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {totalItems === 0 ? 0 : startIndex + 1}
                      -{totalItems === 0 ? 0 : Math.min(endIndex, totalItems)} of {totalItems}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1 || totalItems === 0}
                      >
                        Prev
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {totalItems === 0 ? 1 : currentPage} of {totalItems === 0 ? 1 : totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages || totalItems === 0}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
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
