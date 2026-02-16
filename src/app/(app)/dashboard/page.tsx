'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Receipt, Wallet, Beer, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Due, Beverage } from '@/lib/types';
import { isBeverageFine } from '@/lib/types';
import { Stats } from '@/components/dashboard/stats';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePlayers } from '@/services/players.service';
import { useTeam } from '@/team';
import { useAllFines, useAllPayments, useAllDuePayments } from '@/hooks/use-all-transactions';
import {
  dues as staticDues,
  beverages as staticBeverages
} from '@/lib/static-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AddFineDialog } from '@/components/dashboard/add-fine-dialog';
import { useTeamPredefinedFines } from '@/services/predefined-fines.service';
import { RecordDuePaymentDialog } from '@/components/dues/record-due-payment-dialog';
import { AddEditPaymentDialog } from '@/components/payments/add-edit-payment-dialog';
import { RecordConsumptionDialog } from '@/components/beverages/record-consumption-dialog';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { updatePlayersWithCalculatedBalances } from '@/lib/utils';
import { formatEuro } from '@/lib/csv-utils';
import { groupPaymentsByDay, maxDateFromCollections, movingAverage, sumPaymentsToday, sumPaymentsInLastDays } from '@/lib/stats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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
  amountPaid?: number | null;
  totalAmount?: number | null;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { teamId } = useTeam();
  // Fetch all players and their transactions from Firebase
  const { data: playersData, isLoading: playersLoading, error: playersError } = usePlayers(teamId);
  const { data: finesData, isLoading: finesLoading } = useAllFines({ teamId });
  const { data: paymentsData, isLoading: paymentsLoading } = useAllPayments({ teamId });
  const { data: duePaymentsData, isLoading: duePaymentsLoading } = useAllDuePayments({ teamId });
  const { data: predefinedFines, isLoading: predefinedFinesLoading } = useTeamPredefinedFines(teamId);

  // Keep static data for catalogs (dues, beverages)
  const [dues] = useState<Due[]>(staticDues);
  const [beverages] = useState<Beverage[]>(staticBeverages);

  // Use Firebase data or empty arrays while loading
  const fines = finesData || [];
  const payments = paymentsData || [];
  const duePayments = duePaymentsData || [];

  // Calculate player balances dynamically based on all transactions
  const players = useMemo(() => {
    if (!playersData) return [];

    return updatePlayersWithCalculatedBalances(
      playersData,
      payments,
      fines,
      duePayments,
    );
  }, [playersData, payments, fines, duePayments]);

  // Determine overall loading state
  const isLoading = playersLoading || finesLoading || paymentsLoading ||
    duePaymentsLoading;

  // Dialog states
  const [isAddFineOpen, setAddFineOpen] = useState(false);
  const [isAddPaymentOpen, setAddPaymentOpen] = useState(false);
  const [isRecordDueOpen, setRecordDueOpen] = useState(false);
  const [isRecordBeverageOpen, setRecordBeverageOpen] = useState(false);


  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  const getDueName = (id: string) => dues.find(d => d.id === id)?.name || 'Unknown';

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
        description: isBeverageFine(fine) ? `Beverage: ${fine.reason}` : fine.reason,
        amount: -fine.amount,
        type: isBeverageFine(fine) ? 'beverage' : 'fine',
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

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fines, payments, duePayments, players, dues]);

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
            {t('nav.dashboard')}
          </h1>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {playersError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('dashboard.errorLoading')}</AlertTitle>
              <AlertDescription>
                {playersError.message || t('dashboard.errorLoadingDesc')}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <>
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
            </>
          ) : (
            <>
              {/* Stats Section */}
              <Stats players={players} fines={fines} />

              {/* Data Freshness */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <p>
                  {t('dashboard.lastUpdate')}: {maxDateFromCollections ? (
                    <>
                      {(() => {
                        const d = maxDateFromCollections([payments, fines, duePayments]);
                        return d ? <SafeLocaleDate dateString={d} /> : 'Unknown';
                      })()}
                    </>
                  ) : 'Unknown'}
                </p>
              </div>

              {/* Revenue + Top Beverages */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t('dashboard.revenueByDay')}</CardTitle>
                      {(() => {
                        const todayRevenue = sumPaymentsToday(payments);
                        const avg7d = (() => {
                          const total7 = sumPaymentsInLastDays(payments, 7);
                          return total7 / 7;
                        })();
                        const pct = avg7d > 0 ? ((todayRevenue - avg7d) / avg7d) * 100 : (todayRevenue > 0 ? 100 : 0);
                        let label = 'Normal';
                        let badgeClass = 'bg-muted text-muted-foreground';
                        if (pct >= 50) { label = 'Anomalie: Hoch'; badgeClass = 'bg-green-100 text-green-700 border-green-300'; }
                        else if (pct <= -50) { label = 'Anomalie: Niedrig'; badgeClass = 'bg-amber-100 text-amber-700 border-amber-300'; }
                        return (
                          <Badge variant="outline" className={badgeClass} title={`Heute: ${formatEuro(todayRevenue)} · MA7: ${formatEuro(avg7d)}`}>
                            {label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - 27);
                      const series = groupPaymentsByDay(payments, start, end);
                      const ma = movingAverage(series, 7);
                      const chartData = series.map((p, i) => ({ ...p, ma7: ma[i]?.value ?? null }));
                      return chartData.length > 0 ? (
                        <div className="w-full h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                              <YAxis tickFormatter={(v) => `€${v}`} />
                              <Tooltip formatter={(v: number) => formatEuro(v as number)} labelFormatter={(l) => new Date(l as string).toLocaleDateString()} />
                              <Line type="monotone" dataKey="value" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                              <Line type="monotone" dataKey="ma7" name="7d MA" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No payments available to chart.</p>
                      );
                    })()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.topBeverages')}</CardTitle>
                    <CardDescription>{t('dashboard.mostConsumedDrinks')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const counts = new Map<string, { name: string; count: number }>();
                      for (const f of fines) {
                        if (!f || !isBeverageFine(f)) continue;
                        const name = f.reason || (beverages.find(b => b.id === f.beverageId)?.name ?? 'Unknown');
                        const item = counts.get(name) || { name, count: 0 };
                        item.count += 1;
                        counts.set(name, item);
                      }
                      const items = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
                      return items.length > 0 ? (
                        <div className="space-y-3">
                          {items.map((it) => (
                            <div key={it.name} className="flex items-center justify-between">
                              <div>{it.name}</div>
                              <div className="font-mono">{it.count}x</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No beverage consumptions yet.</p>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Transactions by Type (stacked, last 28 days) */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.transactionsByType')}</CardTitle>
                  <CardDescription>{t('dashboard.transactionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 27);
                    const map = new Map<string, { date: string; payments: number; fines: number; dues: number; beverages: number }>();
                    const keyOf = (ds?: string) => {
                      if (!ds) return '';
                      const d = new Date(ds);
                      if (isNaN(d.getTime()) || d < start || d > end) return '';
                      return d.toISOString().slice(0, 10);
                    };
                    for (const p of payments) {
                      const k = keyOf(p.date);
                      if (!k) continue;
                      const row = map.get(k) || { date: k, payments: 0, fines: 0, dues: 0, beverages: 0 };
                      row.payments += Number(p.amount) || 0;
                      map.set(k, row);
                    }
                    for (const f of fines) {
                      const k = keyOf(f.date);
                      if (!k) continue;
                      const row = map.get(k) || { date: k, payments: 0, fines: 0, dues: 0, beverages: 0 };
                      if (isBeverageFine(f)) {
                        row.beverages += Math.max(0, Number(f.amount) || 0);
                      } else {
                        row.fines += Math.max(0, Number(f.amount) || 0);
                      }
                      map.set(k, row);
                    }
                    for (const d of duePayments) {
                      const k = keyOf(d.createdAt);
                      if (!k) continue;
                      const row = map.get(k) || { date: k, payments: 0, fines: 0, dues: 0, beverages: 0 };
                      row.dues += Math.max(0, Number(d.amountDue) || 0);
                      map.set(k, row);
                    }
                    const data = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
                    return data.length > 0 ? (
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                            <YAxis tickFormatter={(v) => `€${v}`} />
                            <Tooltip formatter={(v: number) => formatEuro(v as number)} labelFormatter={(l) => new Date(l as string).toLocaleDateString()} />
                            <Area type="monotone" dataKey="fines" name="Fines" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} />
                            <Area type="monotone" dataKey="dues" name="Dues" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.15} />
                            <Area type="monotone" dataKey="beverages" name="Beverages" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                            <Area type="monotone" dataKey="payments" name="Payments" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No transactions available to chart.</p>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('dashboard.quickActions')}</CardTitle>
                  <CardDescription>{t('dashboard.quickActionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setAddFineOpen(true)} variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {t('dashboard.addFine')}
                    </Button>
                    <Button onClick={() => setAddPaymentOpen(true)} variant="outline">
                      <Receipt className="mr-2 h-4 w-4" />
                      {t('dashboard.addPayment')}
                    </Button>
                    <Button onClick={() => setRecordDueOpen(true)} variant="outline">
                      <Wallet className="mr-2 h-4 w-4" />
                      {t('dashboard.recordDue')}
                    </Button>
                    <Button onClick={() => setRecordBeverageOpen(true)} variant="outline">
                      <Beer className="mr-2 h-4 w-4" />
                      {t('dashboard.recordBeverage')}
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
                      {t('dashboard.topDebtors')}
                    </CardTitle>
                    <CardDescription>{t('dashboard.topDebtorsDesc')}</CardDescription>
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
                                <p className="font-medium"><Link href={`/players/${player.id}`} className="hover:underline">{player.name}</Link></p>
                                <p className="text-sm text-muted-foreground">{player.nickname}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-bold text-destructive">
                                {formatEuro(Math.abs(player.balance))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {t('dashboard.noPlayersInDebt')}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity Widget */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
                    <CardDescription>{t('dashboard.recentActivityDesc')}</CardDescription>
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
                              <TableCell className="font-medium"><Link href={`/players/${transaction.userId}`} className="hover:underline">{transaction.userName}</Link></TableCell>
                              <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                              <TableCell className={`text-right font-mono ${transaction.amount < 0 ? 'text-destructive' : 'text-positive'}`}>
                                {formatEuro(Math.abs(transaction.amount))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {t('dashboard.noRecentActivity')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Dialogs - handlers removed, they now use Firebase services directly */}
      <AddFineDialog
        isOpen={isAddFineOpen}
        setOpen={setAddFineOpen}
        players={players}
        onFineAdded={() => { }} // Kept for backwards compatibility
        predefinedFines={predefinedFines ?? []}
        predefinedFinesLoading={predefinedFinesLoading}
      />
      <AddEditPaymentDialog
        isOpen={isAddPaymentOpen}
        setOpen={setAddPaymentOpen}
        players={players}
        payment={null}
        onSave={() => { }} // Kept for backwards compatibility
      />
      <RecordDuePaymentDialog
        isOpen={isRecordDueOpen}
        setOpen={setRecordDueOpen}
        players={players}
        dues={dues}
        onRecord={() => { }} // Kept for backwards compatibility
      />
      <RecordConsumptionDialog
        isOpen={isRecordBeverageOpen}
        setOpen={setRecordBeverageOpen}
        players={players}
        beverages={beverages}
        onRecord={() => { }} // Kept for backwards compatibility
      />
    </>
  );
}
