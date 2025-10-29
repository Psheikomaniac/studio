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
import { usePlayerFines } from "@/services/fines.service";
import { usePlayerPayments } from "@/services/payments.service";
import { usePlayerDuePayments } from "@/services/dues.service";
import { usePlayerConsumptions } from "@/services/beverages.service";

// A small helper to format currency consistently
function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  return `${sign}€${Math.abs(value).toFixed(2)}`;
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
  const params = useParams<{ id: string }>();
  const playerId = params?.id;

  const { data: player, isLoading: playerLoading, error: playerError } = usePlayer(playerId);
  const { data: fines, isLoading: finesLoading, error: finesError } = usePlayerFines(playerId);
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = usePlayerPayments(playerId);
  const { data: duePayments, isLoading: dueLoading, error: dueError } = usePlayerDuePayments(playerId);
  const { data: consumptions, isLoading: consLoading, error: consError } = usePlayerConsumptions(playerId);

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
        description: d.userName ? `Due payment (${d.userName})` : "Due payment",
        type: "due",
        amount: -d.amountDue,
        paid: !!d.paid,
      });
    });

    (consumptions || []).forEach((c: BeverageConsumption) => {
      items.push({
        id: `bev-${c.id}`,
        date: c.date,
        description: c.beverageName || "Beverage",
        type: "beverage",
        amount: -c.amount,
        paid: !!c.paid,
      });
    });

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [fines, payments, duePayments, consumptions]);

  if (anyError) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Alert variant="destructive">
          <AlertTitle>Fehler beim Laden</AlertTitle>
          <AlertDescription>
            {(anyError as Error)?.message || "Spielerdaten konnten nicht geladen werden."}
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
                  alt={`Photo of ${player.name}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="font-headline text-3xl font-bold">{player.name}</h1>
                <p className="text-muted-foreground">"{player.nickname}"</p>
              </div>
            </div>
            <Link href="/players" className="text-sm text-muted-foreground hover:underline">Zurück zu Players</Link>
          </div>

          {/* Overview cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Kontostand</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${player.balance < 0 ? 'text-destructive' : 'text-positive'}`}>{formatCurrency(player.balance)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Gesamt Schulden</CardTitle>
                <CardDescription>Fines, Dues, Getränke</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(-(stats.finesTotal + stats.duesTotal + stats.beveragesTotal))}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Gesamt Gutschriften</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-positive">{formatCurrency(stats.paymentsTotal)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fines</CardTitle>
                <CardDescription>Bezahlt vs. offen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Gesamt</div>
                    <div className="text-lg font-bold">{formatCurrency(-stats.finesTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Bezahlt</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.finesPaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Offen</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(-stats.finesUnpaid)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mitgliedsbeiträge</CardTitle>
                <CardDescription>Bezahlt vs. offen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Gesamt</div>
                    <div className="text-lg font-bold">{formatCurrency(-stats.duesTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Bezahlt</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.duesPaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Offen</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(-stats.duesUnpaid)}</div>
                  </div>
                </div>
                {stats.duesExemptCount > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">{stats.duesExemptCount}x exempt</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Getränke</CardTitle>
                <CardDescription>Bezahlt vs. offen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Gesamt</div>
                    <div className="text-lg font-bold">{formatCurrency(-stats.beveragesTotal)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Bezahlt</div>
                    <div className="text-lg font-bold text-positive">{formatCurrency(stats.beveragesPaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Offen</div>
                    <div className="text-lg font-bold text-destructive">{formatCurrency(-stats.beveragesUnpaid)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guthaben</CardTitle>
                <CardDescription>Einzahlungen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Gesamt</div>
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
              <CardTitle>Strafen</CardTitle>
              <CardDescription>Alle Strafen dieses Spielers</CardDescription>
            </CardHeader>
            <CardContent>
              {finesTotalCount > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Beschreibung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedFines.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <SafeLocaleDate dateString={f.date} />
                          </TableCell>
                          <TableCell className={`text-right font-mono ${f.paid ? 'text-positive' : 'text-destructive'}`}>
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
                        Zeige {finesPageStart + 1}-{finesPageEnd} von {finesTotalCount}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFinesPage((p) => Math.max(1, p - 1))}
                          disabled={finesPage <= 1}
                        >
                          Zurück
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Seite {finesPage} von {finesTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFinesPage((p) => Math.min(finesTotalPages, p + 1))}
                          disabled={finesPage >= finesTotalPages}
                        >
                          Weiter
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 text-muted-foreground">Keine Strafen gefunden.</div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Aktivitäten</CardTitle>
              <CardDescription>Letzte 10 Vorgänge</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Beschreibung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><SafeLocaleDate dateString={item.date} /></TableCell>
                        <TableCell className={`text-right font-mono ${item.paid ? 'text-positive' : 'text-destructive'}`}>
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">Keine Aktivitäten gefunden.</div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </main>
  );
}
