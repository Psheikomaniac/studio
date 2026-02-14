"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeLocaleDate } from "@/components/shared/safe-locale-date";
import type { Fine, Payment, DuePayment, BeverageConsumption } from "@/lib/types";
import { usePlayer } from "@/services/players.service";
import { useTeam } from "@/team";
import { usePlayerFines } from "@/services/fines.service";
import { usePlayerPayments } from "@/services/payments.service";
import { usePlayerDuePayments } from "@/services/dues.service";
import { usePlayerConsumptions } from "@/services/beverages.service";
import { formatEuro } from "@/lib/csv-utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { groupPaymentsByDay } from "@/lib/stats";
import { useTranslation } from 'react-i18next';

// A small helper to format currency consistently
function formatCurrency(value: number): string {
  return formatEuro(Math.abs(value));
}

type ActivityItem = {
  id: string;
  date: string;
  description: string;
  type: "fine" | "payment" | "due" | "beverage";
  amount: number; // negative for debits, positive for credits
  paid?: boolean; // optional: green if paid, red if not
};

export default function PlayerDetailsPage() {
  const { t } = useTranslation();
  const { teamId } = useTeam();
  const params = useParams<{ id: string }>();
  const playerId = params?.id;

  const { data: player, isLoading: playerLoading, error: playerError } = usePlayer(teamId, playerId);
  const { data: fines, isLoading: finesLoading, error: finesError } = usePlayerFines(teamId, playerId);
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = usePlayerPayments(teamId, playerId);
  const { data: duePayments, isLoading: dueLoading, error: dueError } = usePlayerDuePayments(teamId, playerId);
  const { data: consumptions, isLoading: consLoading, error: consError } = usePlayerConsumptions(teamId, playerId);

  const isLoading = playerLoading || finesLoading || paymentsLoading || dueLoading || consLoading;
  const anyError = playerError || finesError || paymentsError || dueError || consError;

  const stats = useMemo(() => {
    const finesList = fines || [];
    const paymentsList = payments || [];
    const duesList = duePayments || [];
    const consList = consumptions || [];

    const finesTotal = finesList.reduce((sum, f) => sum + f.amount, 0);
    const finesPaid = finesList.reduce((sum, f) => sum + (f.paid ? f.amount : (f.amountPaid || 0)), 0);
    const finesUnpaid = Math.max(0, finesTotal - finesPaid);

    const paymentsTotal = paymentsList.reduce((sum, p) => sum + p.amount, 0);

    const beveragesTotal = consList.reduce((sum, c) => sum + c.amount, 0);
    const beveragesPaid = consList.reduce((sum, c) => sum + (c.paid ? c.amount : (c.amountPaid || 0)), 0);
    const beveragesUnpaid = Math.max(0, beveragesTotal - beveragesPaid);

    const duesTotal = duesList.reduce((sum, d) => sum + d.amountDue, 0);
    const duesPaid = duesList.reduce((sum, d) => sum + (d.paid ? d.amountDue : (d.amountPaid || 0)), 0);
    const duesUnpaid = Math.max(0, duesTotal - duesPaid);
    const duesExemptCount = duesList.filter(d => d.exempt).length;

    return {
      finesTotal,
      finesPaid,
      finesUnpaid,
      paymentsTotal,
      beveragesTotal,
      beveragesPaid,
      beveragesUnpaid,
      duesTotal,
      duesPaid,
      duesUnpaid,
      duesExemptCount,
    };
  }, [fines, payments, duePayments, consumptions]);

  // Pagination for fines (Strafen)
  const FINES_PAGE_SIZE = 20;
  const [finesPage, setFinesPage] = useState(1);

  const sortedFines = useMemo(() => {
    return (fines || []).slice().sort((a: Fine, b: Fine) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fines]);

  const finesTotalCount = sortedFines.length;
  const finesTotalPages = Math.max(1, Math.ceil(finesTotalCount / FINES_PAGE_SIZE));
  const finesPageStart = (finesPage - 1) * FINES_PAGE_SIZE;
  const finesPageEnd = Math.min(finesPageStart + FINES_PAGE_SIZE, finesTotalCount);
  const pagedFines = sortedFines.slice(finesPageStart, finesPageEnd);

  // Keep current fines page in range when data changes
  useEffect(() => {
    setFinesPage((p) => Math.min(Math.max(1, p), finesTotalPages));
  }, [finesTotalPages]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    (fines || []).forEach((f: Fine) => {
      items.push({
        id: `fine-${f.id}`,
        date: f.date,
        description: f.reason,
        type: "fine",
        amount: -f.amount,
        paid: !!f.paid,
      });
    });

    (payments || []).forEach((p: Payment) => {
      items.push({
        id: `payment-${p.id}`,
        date: p.date,
        description: p.reason,
        type: "payment",
        amount: p.amount,
        paid: !!p.paid,
      });
    });

    (duePayments || []).forEach((d: DuePayment) => {
      items.push({
        id: `due-${d.id}`,
        date: d.createdAt,
        description: d.userName
          ? t('playerDetailPage.duePaymentWithName', { name: d.userName })
          : t('playerDetailPage.duePayment'),
        type: "due",
        amount: -d.amountDue,
        paid: !!d.paid,
      });
    });

    (consumptions || []).forEach((c: BeverageConsumption) => {
      items.push({
        id: `bev-${c.id}`,
        date: c.date,
        description: c.beverageName || t('playerDetailPage.beveragePlaceholder'),
        type: "beverage",
        amount: -c.amount,
        paid: !!c.paid,
      });
    });

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [fines, payments, duePayments, consumptions, t]);

  // Build timeline series for last 90 days
  const end90 = useMemo(() => new Date(), []);
  const start90 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 89);
    return d;
  }, []);

  type DayPoint = { date: string; value: number };

  function groupByDay<T>(items: T[], getDate: (it: T) => string | undefined, getAmount: (it: T) => number): DayPoint[] {
    const map = new Map<string, number>();
    for (const it of items) {
      const ds = getDate(it);
      if (!ds) continue;
      const d = new Date(ds);
      if (isNaN(d.getTime())) continue;
      if (d < start90 || d > end90) continue;
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + getAmount(it));
    }
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
  }

  const paymentsSeries = useMemo(() => groupPaymentsByDay((payments || []), start90, end90), [payments, start90, end90]);
  const finesSeries = useMemo(() => groupByDay((fines || []), f => f.date, f => Math.max(0, Number(f.amount) || 0)), [fines, start90, end90]);
  const beveragesSeries = useMemo(() => groupByDay((consumptions || []), c => c.date, c => Math.max(0, Number(c.amount) || 0)), [consumptions, start90, end90]);

  if (anyError) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Alert variant="destructive">
          <AlertTitle>{t('playerDetailPage.errorLoadingTitle')}</AlertTitle>
          <AlertDescription>
            {(anyError as Error)?.message || t('playerDetailPage.errorLoadingDesc')}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {isLoading || !player ? (
        <div className="grid gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image
                  src={player.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=64&background=94a3b8&color=fff`}
                  alt={player.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="font-headline text-3xl font-bold">{player.name}</h1>
                <p className="text-muted-foreground">"{player.nickname}"</p>
              </div>
            </div>
            <Link href="/players" className="text-sm text-muted-foreground hover:underline">
              {t('playerDetailPage.backToPlayers')}
            </Link>
          </div>

          {/* Overview cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('playerDetailPage.balanceTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${player.balance < 0 ? 'text-destructive' : 'text-positive'}`}>{formatCurrency(player.balance)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('playerDetailPage.totalDebtTitle')}</CardTitle>
                <CardDescription>{t('playerDetailPage.totalDebtDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(-(stats.finesTotal + stats.duesTotal + stats.beveragesTotal))}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{t('playerDetailPage.totalCreditTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-positive">{formatCurrency(stats.paymentsTotal)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Timelines */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.paymentsByDayTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsSeries.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={paymentsSeries} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                        <YAxis tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(v:number) => formatEuro(v as number)} labelFormatter={(l) => new Date(l as string).toLocaleDateString()} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={t('playerDetailPage.paymentsSeriesName')}
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('playerDetailPage.noPayments')}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.finesByDayTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {finesSeries.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={finesSeries} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                        <YAxis tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(v:number) => formatEuro(v as number)} labelFormatter={(l) => new Date(l as string).toLocaleDateString()} />
                        <Bar
                          dataKey="value"
                          name={t('playerDetailPage.finesSeriesName')}
                          fill="hsl(var(--destructive))"
                          radius={[4,4,0,0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('playerDetailPage.noFines')}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.beveragesByDayTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                {beveragesSeries.length > 0 ? (
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={beveragesSeries} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                        <YAxis tickFormatter={(v) => `€${v}`} />
                        <Tooltip formatter={(v:number) => formatEuro(v as number)} labelFormatter={(l) => new Date(l as string).toLocaleDateString()} />
                        <Bar
                          dataKey="value"
                          name={t('playerDetailPage.beveragesSeriesName')}
                          fill="hsl(var(--primary))"
                          radius={[4,4,0,0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('playerDetailPage.noBeverages')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.finesStatsTitle')}</CardTitle>
                <CardDescription>{t('playerDetailPage.paidVsOpen')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.totalLabel')}</div>
                    <div className="text-lg font-bold">{formatCurrency(-stats.finesTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.paidLabel')}</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.finesPaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.openLabel')}</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(-stats.finesUnpaid)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.duesStatsTitle')}</CardTitle>
                <CardDescription>{t('playerDetailPage.paidVsOpen')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.totalLabel')}</div>
                    <div className="text-lg font-bold">{formatCurrency(-stats.duesTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.paidLabel')}</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.duesPaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.openLabel')}</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(-stats.duesUnpaid)}</div>
                  </div>
                </div>
                {stats.duesExemptCount > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {t('playerDetailPage.exemptCount', { count: stats.duesExemptCount })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.beveragesStatsTitle')}</CardTitle>
                <CardDescription>{t('playerDetailPage.paidVsOpen')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.totalLabel')}</div>
                    <div className="text-lg font-bold">{formatCurrency(-stats.beveragesTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.paidLabel')}</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.beveragesPaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.openLabel')}</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(-stats.beveragesUnpaid)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('playerDetailPage.creditStatsTitle')}</CardTitle>
                <CardDescription>{t('playerDetailPage.creditStatsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('playerDetailPage.totalLabel')}</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.paymentsTotal)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strafen und Aktivitäten nebeneinander */}
          <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('playerDetailPage.finesTableTitle')}</CardTitle>
              <CardDescription>{t('playerDetailPage.finesTableDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {finesTotalCount > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('playerDetailPage.dateColumn')}</TableHead>
                        <TableHead className="text-right">{t('playerDetailPage.amountColumn')}</TableHead>
                        <TableHead>{t('playerDetailPage.descriptionColumn')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedFines.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <SafeLocaleDate dateString={f.date} />
                          </TableCell>
                          <TableCell className={`text-right font-mono text-destructive`}>
                            {formatCurrency(-f.amount)}
                          </TableCell>
                          <TableCell>{f.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {finesTotalCount > FINES_PAGE_SIZE && (
                    <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t('playerDetailPage.paginationSummary', {
                          from: finesPageStart + 1,
                          to: finesPageEnd,
                          total: finesTotalCount,
                        })}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFinesPage((p) => Math.max(1, p - 1))}
                          disabled={finesPage <= 1}
                        >
                          {t('playerDetailPage.prevPage')}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t('playerDetailPage.paginationLabel', { page: finesPage, pages: finesTotalPages })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFinesPage((p) => Math.min(finesTotalPages, p + 1))}
                          disabled={finesPage >= finesTotalPages}
                        >
                          {t('playerDetailPage.nextPage')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 text-muted-foreground">{t('playerDetailPage.noFinesFound')}</div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('playerDetailPage.activityTitle')}</CardTitle>
              <CardDescription>{t('playerDetailPage.activityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('playerDetailPage.dateColumn')}</TableHead>
                      <TableHead className="text-right">{t('playerDetailPage.amountColumn')}</TableHead>
                      <TableHead>{t('playerDetailPage.descriptionColumn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><SafeLocaleDate dateString={item.date} /></TableCell>
                        <TableCell className={`text-right font-mono ${item.amount < 0 ? 'text-destructive' : item.amount > 0 ? 'text-positive' : 'text-muted-foreground'}`}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">{t('playerDetailPage.noActivity')}</div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </main>
  );
}
