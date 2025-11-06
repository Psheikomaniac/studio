
'use client';

// Force dynamic rendering since this page uses Firebase hooks
export const dynamic = 'force-dynamic';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, AlertCircle, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Player } from '@/lib/types';
import { usePlayers, usePlayersService } from '@/services/players.service';
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';
import { AddEditPlayerDialog } from '@/components/players/add-edit-player-dialog';
import { DeletePlayerDialog } from '@/components/players/delete-player-dialog';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatEuro } from "@/lib/csv-utils";


export default function PlayersPage() {
  // Firebase hooks for real-time data
  const { data: players, isLoading, error } = usePlayers();
  const playersService = usePlayersService();

  // Collection group data used for per-player aggregates (Phase 2)
  const { data: finesData } = useAllFines();
  const { data: paymentsData } = useAllPayments();
  const { data: duePaymentsData } = useAllDuePayments();
  const { data: consumptionsData } = useAllBeverageConsumptions();

  const fines = finesData || [];
  const payments = paymentsData || [];
  const duePayments = duePaymentsData || [];
  const beverageConsumptions = consumptionsData || [];

  // Recompute balances and derive per-user stats (Players-specific rule)
  // Neue Formel: (Guthaben + Guthaben Rest) - (Fines + Dues + Beverages)
  // Hinweis: Dues mit Status "exempt" werden nicht gezählt.
  const balanceBreakdownByUser = useMemo(() => {
    type Breakdown = {
      guthaben: number;
      guthabenRest: number;
      fines: number;
      dues: number;
      beverages: number;
      totalCredits: number;
      totalLiabilities: number;
      balance: number;
    };

    const m = new Map<string, Breakdown>();
    const ensure = (userId: string) => {
      let v = m.get(userId);
      if (!v) {
        v = { guthaben: 0, guthabenRest: 0, fines: 0, dues: 0, beverages: 0, totalCredits: 0, totalLiabilities: 0, balance: 0 };
        m.set(userId, v);
      }
      return v;
    };

    const norm = (s?: string) => (s || '').trim().toLowerCase();

    // Credits: Guthaben + Guthaben Rest (nur offene/unbezahlte Credits werden berücksichtigt)
    for (const p of payments) {
      if (!p?.userId) continue;
      if (p.paid) continue; // nur unpaid Guthaben/Guthaben Rest zählen
      const r = norm(p.reason);
      const amt = Number(p.amount) || 0;
      // Robustere Klassifikation:
      // - explizit "guthaben rest" oder enthält es → Guthaben Rest
      // - enthält "guthaben" (z. B. "Strafen: Name (Guthaben)") → Guthaben
      // - beginnt mit "einzahlung" (z. B. "Einzahlung: Name") → Guthaben
      if (r === 'guthaben rest' || r.includes('guthaben rest')) {
        ensure(p.userId).guthabenRest += amt;
      } else if (r === 'guthaben' || r.includes('guthaben') || r.startsWith('einzahlung')) {
        ensure(p.userId).guthaben += amt;
      }
    }

    // Fines: Nur offene Restbeträge (unbezahlt/teilbezahlt)
    for (const f of fines) {
      if (!f?.userId) continue;
      let remaining = 0;
      if (!f.paid) {
        const amt = Number(f.amount) || 0;
        const amtPaid = Number(f.amountPaid || 0);
        remaining = Math.max(0, amt - amtPaid);
      }
      ensure(f.userId).fines += remaining;
    }

    // Dues: Nur offene Restbeträge (exempt ausgeschlossen)
    for (const d of duePayments) {
      if (!d?.userId || d.exempt) continue;
      let remaining = 0;
      if (!d.paid) {
        const amt = Number(d.amountDue) || 0;
        const amtPaid = Number(d.amountPaid || 0);
        remaining = Math.max(0, amt - amtPaid);
      }
      ensure(d.userId).dues += remaining;
    }

    // Beverages: Nur offene Restbeträge (unbezahlt/teilbezahlt)
    for (const b of beverageConsumptions) {
      if (!b?.userId || typeof b.amount !== 'number') continue;
      let remaining = 0;
      if (!b.paid) {
        const amt = Number(b.amount) || 0;
        const amtPaid = Number(b.amountPaid || 0);
        remaining = Math.max(0, amt - amtPaid);
      }
      ensure(b.userId).beverages += remaining;
    }

    // Final totals per user
    for (const [userId, v] of m) {
      v.totalCredits = (v.guthaben || 0) + (v.guthabenRest || 0);
      v.totalLiabilities = (v.fines || 0) + (v.dues || 0) + (v.beverages || 0);
      v.balance = v.totalCredits - v.totalLiabilities;
      m.set(userId, v);
    }

    return m;
  }, [payments, fines, duePayments, beverageConsumptions]);

  const enhancedPlayers = useMemo(() => {
    if (!players) return [] as Player[];
    return players.map(p => {
      const bb = balanceBreakdownByUser.get(p.id);
      return {
        ...p,
        balance: bb?.balance ?? 0,
      };
    });
  }, [players, balanceBreakdownByUser]);

  const lastActivityByUser = useMemo(() => {
    const map = new Map<string, string>();
    const setIfMax = (userId?: string, date?: string) => {
      if (!userId || !date) return;
      const t = new Date(date).getTime();
      const prev = map.get(userId);
      if (!prev || t > new Date(prev).getTime()) map.set(userId, date);
    };
    fines.forEach(f => setIfMax(f.userId, f.date));
    payments.forEach(p => setIfMax(p.userId, p.date));
    duePayments.forEach(d => setIfMax(d.userId, d.createdAt));
    beverageConsumptions.forEach(b => setIfMax(b.userId, b.date));
    return map;
  }, [fines, payments, duePayments, beverageConsumptions]);

  const beverageCountByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of beverageConsumptions) {
      if (!c?.userId) continue;
      m.set(c.userId, (m.get(c.userId) ?? 0) + 1);
    }
    return m;
  }, [beverageConsumptions]);

  // Build last 6 months keys and labels
  const last6Months = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const d = new Date();
    d.setDate(1); // normalize to first of month
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleString(undefined, { month: 'short' });
      arr.push({ key, label });
    }
    return arr;
  }, []);

  // Payments per user per month (last 6 months)
  const paymentSparklineByUser = useMemo(() => {
    const map = new Map<string, number[]>();
    const indexByMonth = new Map(last6Months.map((m, idx) => [m.key, idx] as const));
    for (const p of payments) {
      if (!p?.userId || !p?.date) continue;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const idx = indexByMonth.get(key);
      if (idx == null) continue; // outside 6m window
      const arr = map.get(p.userId) || Array(6).fill(0);
      arr[idx] += Number(p.amount) || 0;
      map.set(p.userId, arr);
    }
    return map;
  }, [payments, last6Months]);


  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { toast } = useToast();

  const handleAddClick = () => {
    setSelectedPlayer(null);
    setAddEditDialogOpen(true);
  };

  const handleEditClick = (player: Player) => {
    setSelectedPlayer(player);
    setAddEditDialogOpen(true);
  };

  const handleDeleteClick = (player: Player) => {
    setSelectedPlayer(player);
    setDeleteDialogOpen(true);
  };

  const handleSavePlayer = async (playerData: Omit<Player, 'id' | 'balance' | 'totalPaidPenalties' | 'totalUnpaidPenalties'> & { id?: string }) => {
    if (!playersService) {
      toast({
        variant: "destructive",
        title: "Firebase Not Available",
        description: "Cannot save player without Firebase connection",
      });
      return;
    }

    try {
      if (selectedPlayer) {
        // Edit mode - update existing player
        await playersService.updatePlayer(selectedPlayer.id, playerData);
        toast({ title: "Player Updated", description: `${playerData.name} has been updated.` });
      } else {
        // Add mode - create new player
        const newPlayerData = {
          ...playerData,
          balance: 0,
          totalPaidPenalties: 0,
          totalUnpaidPenalties: 0,
        };
        await playersService.createPlayer(newPlayerData);
        toast({ title: "Player Added", description: `${newPlayerData.name} has been added.` });
      }
      setAddEditDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save player',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlayer || !playersService) return;

    try {
      await playersService.deletePlayer(selectedPlayer.id);
      toast({
        variant: "destructive",
        title: "Player Deleted",
        description: `${selectedPlayer.name} has been removed.`
      });
      setDeleteDialogOpen(false);
      setSelectedPlayer(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete player',
      });
    }
  };

  const activePlayers = (enhancedPlayers ?? []).filter((p) => p.active !== false);
  const inactivePlayers = (enhancedPlayers ?? []).filter((p) => p.active === false);

  // Loading state
  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Players</AlertTitle>
          <AlertDescription>
            {error.message || 'Failed to load players. Please try again later.'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }


  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">
              Player Management
            </h1>
             <Button onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Player
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Active Players</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      <span className="sr-only">Image</span>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Beverages</TableHead>
                    <TableHead>Payments (6m)</TableHead>
                    <TableHead className="text-right" title="(offene Guthaben + offener Guthaben Rest) - (offene Strafen + offene Beiträge + offene Getränke)">Balance</TableHead>
                    <TableHead className="w-[140px] text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePlayers.map((player) => {
                    const balance = player.balance;
                    return (
                      <TableRow key={player.id}>
                        <TableCell className="hidden sm:table-cell">
                          <a href={`/players/${player.id}`} className="inline-block">
                            <Image
                              alt="Player image"
                              className="aspect-square rounded-full object-cover"
                              height="40"
                              src={player.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=40&background=94a3b8&color=fff`}
                              width="40"
                            />
                          </a>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <a href={`/players/${player.id}`} className="hover:underline">{player.name}</a>
                            {(() => {
                              const last = lastActivityByUser.get(player.id);
                              const tooOld = last ? ((Date.now() - new Date(last).getTime()) / (1000*60*60*24) > 90) : false;
                              return tooOld ? (
                                <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300">Inaktiv</Badge>
                              ) : null;
                            })()}
                            {balance < -50 && (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">Risiko</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{player.nickname}</TableCell>
                        <TableCell>
                          {(() => {
                            const d = lastActivityByUser.get(player.id);
                            return d ? <SafeLocaleDate dateString={d} /> : '-';
                          })()}
                        </TableCell>
                        <TableCell>{beverageCountByUser.get(player.id) ?? 0}</TableCell>
                        <TableCell className="w-[120px]">
                          {(() => {
                            const arr = paymentSparklineByUser.get(player.id) || Array(6).fill(0);
                            const data = arr.map((v, i) => ({ i, v }));
                            const max = Math.max(1, ...arr);
                            return (
                              <div className="h-8 w-[110px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                                    <XAxis dataKey="i" hide />
                                    <YAxis domain={[0, max]} hide />
                                    <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            balance > 0
                              ? 'text-positive'
                              : balance < 0
                                ? 'text-destructive'
                                : 'text-foreground'
                          }`}
                        >
                          {(() => {
                            const bb = balanceBreakdownByUser.get(player.id);
                            const g = bb?.guthaben ?? 0;
                            const gr = bb?.guthabenRest ?? 0;
                            const f = bb?.fines ?? 0;
                            const d = bb?.dues ?? 0;
                            const b = bb?.beverages ?? 0;
                            return (
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{formatEuro(Math.abs(balance))}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="end">
                                    <div className="text-xs">
                                      <div className="font-medium mb-1">Berechnung</div>
                                      <div className="mb-1">(offene Guthaben + offener Guthaben Rest) - (offene Strafen + offene Beiträge + offene Getränke)</div>
                                      <div className="text-muted-foreground mb-1">Es werden nur offene (unbezahlte) Guthaben/Guthaben Rest sowie offene Restbeträge berücksichtigt.</div>
                                      <div className="font-mono">
                                        Guthaben (offen): {formatEuro(g)} • Guthaben Rest (offen): {formatEuro(gr)}<br />
                                        Strafen (offen): {formatEuro(f)} • Beiträge (offen): {formatEuro(d)} • Getränke (offen): {formatEuro(b)}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit player"
                              title="Edit"
                              onClick={() => handleEditClick(player)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Set inactive"
                              title="Set inactive"
                              onClick={async () => {
                                if (!playersService) return;
                                const nextActive = false;
                                try {
                                  await playersService.updatePlayer(player.id, { active: nextActive } as any);
                                  toast({
                                    title: "Player Deactivated",
                                    description: `${player.name} is now inactive.`,
                                  });
                                } catch (err) {
                                  toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to update player status' });
                                }
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete player"
                              title="Delete"
                              onClick={() => handleDeleteClick(player)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {activePlayers.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  No active players.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inactive Players</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                      <span className="sr-only">Image</span>
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Beverages</TableHead>
                    <TableHead>Payments (6m)</TableHead>
                    <TableHead className="text-right" title="(offene Guthaben + offener Guthaben Rest) - (offene Strafen + offene Beiträge + offene Getränke)">Balance</TableHead>
                    <TableHead className="w-[140px] text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactivePlayers.map((player) => {
                    const balance = player.balance;
                    return (
                      <TableRow key={player.id}>
                        <TableCell className="hidden sm:table-cell">
                          <a href={`/players/${player.id}`} className="inline-block">
                            <Image
                              alt="Player image"
                              className="aspect-square rounded-full object-cover"
                              height="40"
                              src={player.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=40&background=94a3b8&color=fff`}
                              width="40"
                            />
                          </a>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <a href={`/players/${player.id}`} className="hover:underline">{player.name}</a>
                            <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300">Inaktiv</Badge>
                            {balance < -50 && (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">Risiko</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{player.nickname}</TableCell>
                        <TableCell>
                          {(() => {
                            const d = lastActivityByUser.get(player.id);
                            return d ? <SafeLocaleDate dateString={d} /> : '-';
                          })()}
                        </TableCell>
                        <TableCell>{beverageCountByUser.get(player.id) ?? 0}</TableCell>
                        <TableCell className="w-[120px]">
                          {(() => {
                            const arr = paymentSparklineByUser.get(player.id) || Array(6).fill(0);
                            const data = arr.map((v, i) => ({ i, v }));
                            const max = Math.max(1, ...arr);
                            return (
                              <div className="h-8 w-[110px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                                    <XAxis dataKey="i" hide />
                                    <YAxis domain={[0, max]} hide />
                                    <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            balance > 0
                              ? 'text-positive'
                              : balance < 0
                                ? 'text-destructive'
                                : 'text-foreground'
                          }`}
                        >
                          {(() => {
                            const bb = balanceBreakdownByUser.get(player.id);
                            const g = bb?.guthaben ?? 0;
                            const gr = bb?.guthabenRest ?? 0;
                            const f = bb?.fines ?? 0;
                            const d = bb?.dues ?? 0;
                            const b = bb?.beverages ?? 0;
                            return (
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{formatEuro(Math.abs(balance))}</span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="end">
                                    <div className="text-xs">
                                      <div className="font-medium mb-1">Berechnung</div>
                                      <div className="mb-1">(offene Guthaben + offener Guthaben Rest) - (offene Strafen + offene Beiträge + offene Getränke)</div>
                                      <div className="text-muted-foreground mb-1">Es werden nur offene (unbezahlte) Guthaben/Guthaben Rest sowie offene Restbeträge berücksichtigt.</div>
                                      <div className="font-mono">
                                        Guthaben (offen): {formatEuro(g)} • Guthaben Rest (offen): {formatEuro(gr)}<br />
                                        Strafen (offen): {formatEuro(f)} • Beiträge (offen): {formatEuro(d)} • Getränke (offen): {formatEuro(b)}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit player"
                              title="Edit"
                              onClick={() => handleEditClick(player)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Set active"
                              title="Set active"
                              onClick={async () => {
                                if (!playersService) return;
                                const nextActive = true;
                                try {
                                  await playersService.updatePlayer(player.id, { active: nextActive } as any);
                                  toast({
                                    title: "Player Activated",
                                    description: `${player.name} is now active.`,
                                  });
                                } catch (err) {
                                  toast({ variant: 'destructive', title: 'Error', description: err instanceof Error ? err.message : 'Failed to update player status' });
                                }
                              }}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label="Delete player"
                              title="Delete"
                              onClick={() => handleDeleteClick(player)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {inactivePlayers.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                  No inactive players.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <AddEditPlayerDialog
        isOpen={isAddEditDialogOpen}
        setOpen={setAddEditDialogOpen}
        onSave={handleSavePlayer}
        player={selectedPlayer}
      />
      <DeletePlayerDialog
        isOpen={isDeleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        playerName={selectedPlayer?.name}
      />
    </>
  );
}
