
'use client';

// Force dynamic rendering since this page uses Firebase hooks
export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Player } from '@/lib/types';
import { usePlayers, usePlayersService } from '@/services/players.service';
import { useTeam } from '@/team';
import { AddEditPlayerDialog } from '@/components/players/add-edit-player-dialog';
import { DeletePlayerDialog } from '@/components/players/delete-player-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  PlayersTable,
  PlayersTableSortState,
  PlayersTableSortableColumn,
} from '@/components/players/players-table';
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import { usePlayerBalances } from '@/hooks/use-player-balances';
import { usePlayerStats } from '@/hooks/use-player-stats';
import { dues as staticDues } from '@/lib/static-data';
import { useTranslation } from 'react-i18next';
import { formatEuro } from '@/lib/csv-utils';

export default function PlayersPage() {
  const { t } = useTranslation();
  const { teamId } = useTeam();

  // Firebase hooks for real-time data
  const { data: playersData, isLoading: playersLoading, error } = usePlayers(teamId);
  const playersService = usePlayersService(teamId);

  // Load all transaction data
  const { data: finesData, isLoading: finesLoading } = useAllFines({ teamId });
  const { data: paymentsData, isLoading: paymentsLoading } = useAllPayments({ teamId });
  const { data: duePaymentsData, isLoading: duePaymentsLoading } = useAllDuePayments({ teamId });
  const { data: consumptionsData, isLoading: consumptionsLoading } = useAllBeverageConsumptions({ teamId });

  // Use Firebase data or empty arrays while loading
  const fines = finesData || [];
  const payments = paymentsData || [];
  const duePayments = duePaymentsData || [];
  const beverageConsumptions = consumptionsData || [];
  const dues = staticDues;

  // Calculate player statistics and balances
  const { lastActivityByUser, beverageCountByUser, paymentSparklineByUser } = usePlayerStats(
    payments,
    fines,
    duePayments,
    beverageConsumptions
  );

  const balanceBreakdownByUser = usePlayerBalances(
    payments,
    fines,
    duePayments,
    beverageConsumptions,
    dues
  );

  const [sortState, setSortState] = useState<PlayersTableSortState>({
    column: 'balance',
    direction: 'asc',
  });

  const handleTableSortChange = (column: PlayersTableSortableColumn) => {
    setSortState((prev) => {
      if (!prev || prev.column !== column) {
        // First click on a column -> sort ascending by that column
        return { column, direction: 'asc' };
      }

      if (prev.direction === 'asc') {
        // Second click on the same column -> sort descending
        return { column, direction: 'desc' };
      }

      // Third click -> reset to ID sorting (base order)
      return { column: 'id', direction: 'asc' };
    });
  };

  // Update players with correct calculated balances from balanceBreakdownByUser and apply selected sorting
  const players = useMemo(() => {
    if (!playersData) return [];

    const withBalance = playersData.map(player => ({
      ...player,
      balance: balanceBreakdownByUser.get(player.id)?.balance || 0
    }));

    const sorted = [...withBalance];

    const currentSort = sortState ?? { column: 'balance', direction: 'asc' };

    sorted.sort((a, b) => {
      switch (currentSort.column) {
        case 'name':
          return currentSort.direction === 'asc'
            ? a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
            : b.name.localeCompare(a.name, 'de', { sensitivity: 'base' });
        case 'nickname': {
          const aNick = a.nickname || '';
          const bNick = b.nickname || '';
          return currentSort.direction === 'asc'
            ? aNick.localeCompare(bNick, 'de', { sensitivity: 'base' })
            : bNick.localeCompare(aNick, 'de', { sensitivity: 'base' });
        }
        case 'lastActivity': {
          const aLast = lastActivityByUser.get(a.id);
          const bLast = lastActivityByUser.get(b.id);

          if (!aLast && !bLast) return 0;
          if (!aLast) return currentSort.direction === 'asc' ? 1 : -1;
          if (!bLast) return currentSort.direction === 'asc' ? -1 : 1;

          const aTime = new Date(aLast).getTime();
          const bTime = new Date(bLast).getTime();

          if (aTime === bTime) return 0;

          return currentSort.direction === 'asc'
            ? aTime - bTime
            : bTime - aTime;
        }
        case 'beverages': {
          const aCount = beverageCountByUser.get(a.id) ?? 0;
          const bCount = beverageCountByUser.get(b.id) ?? 0;

          if (aCount === bCount) return 0;

          return currentSort.direction === 'asc'
            ? aCount - bCount
            : bCount - aCount;
        }
        case 'payments': {
          const aSeries = paymentSparklineByUser.get(a.id) || [];
          const bSeries = paymentSparklineByUser.get(b.id) || [];

          const aSum = aSeries.reduce((sum, value) => sum + value, 0);
          const bSum = bSeries.reduce((sum, value) => sum + value, 0);

          if (aSum === bSum) return 0;

          return currentSort.direction === 'asc'
            ? aSum - bSum
            : bSum - aSum;
        }
        case 'balance': {
          if (a.balance === b.balance) return 0;
          return currentSort.direction === 'asc'
            ? a.balance - b.balance
            : b.balance - a.balance;
        }
        case 'id':
        default:
          return a.id.localeCompare(b.id, 'de', { sensitivity: 'base' });
      }
    });

    return sorted;
  }, [
    playersData,
    balanceBreakdownByUser,
    sortState,
    lastActivityByUser,
    beverageCountByUser,
    paymentSparklineByUser,
  ]);

  // Determine overall loading state
  const isLoading = playersLoading || finesLoading || paymentsLoading ||
    duePaymentsLoading || consumptionsLoading;

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
        title: t('playersPage.firebaseUnavailableTitle'),
        description: t('playersPage.firebaseUnavailableDesc'),
      });
      return;
    }

    try {
      if (selectedPlayer) {
        // Edit mode - update existing player
        await playersService.updatePlayer(selectedPlayer.id, playerData);
        toast({
          title: t('playersPage.playerUpdatedTitle'),
          description: t('playersPage.playerUpdatedDesc', { name: playerData.name }),
        });
      } else {
        // Add mode - create new player
        const newPlayerData = {
          ...playerData,
          balance: 0,
          totalPaidPenalties: 0,
          totalUnpaidPenalties: 0,
        };
        await playersService.createPlayer(newPlayerData);
        toast({
          title: t('playersPage.playerAddedTitle'),
          description: t('playersPage.playerAddedDesc', { name: newPlayerData.name }),
        });
      }
      setAddEditDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('playersPage.saveErrorTitle'),
        description: error instanceof Error ? error.message : t('playersPage.saveErrorDesc'),
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPlayer || !playersService) return;

    try {
      await playersService.deletePlayer(selectedPlayer.id);
      toast({
        variant: "destructive",
        title: t('playersPage.playerDeletedTitle'),
        description: t('playersPage.playerDeletedDesc', { name: selectedPlayer.name }),
      });
      setDeleteDialogOpen(false);
      setSelectedPlayer(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('playersPage.deleteErrorTitle'),
        description: error instanceof Error ? error.message : t('playersPage.deleteErrorDesc'),
      });
    }
  };

  const handleToggleStatus = async (player: Player) => {
    if (!playersService) return;
    const nextActive = !(player.active !== false);
    try {
      await playersService.updatePlayer(player.id, { active: nextActive } as any);
      toast({
        title: nextActive ? t('playersPage.statusActivatedTitle') : t('playersPage.statusDeactivatedTitle'),
        description: nextActive
          ? t('playersPage.statusActivatedDesc', { name: player.name })
          : t('playersPage.statusDeactivatedDesc', { name: player.name }),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('playersPage.statusErrorTitle'),
        description: err instanceof Error ? err.message : t('playersPage.statusErrorDesc'),
      });
    }
  };

  const handleCopyDebtorsClick = async () => {
    try {
      const allPlayers = players ?? [];
      // Nur Spieler mit offenem Betrag (Schulden) berücksichtigen: balance < 0
      const debtors = allPlayers.filter((p) => (p.balance ?? 0) < 0);

      if (debtors.length === 0) {
        toast({
          title: t('playersPage.copyDebtorsToast.noDebtorsTitle'),
          description: t('playersPage.copyDebtorsToast.noDebtorsDesc'),
        });
        return;
      }

      const lines = debtors.map((p) => {
        const amount = Math.abs(p.balance ?? 0);
        return `${p.name}: ${formatEuro(amount)}!`;
      });

      const text = lines.join('\n');

      await navigator.clipboard.writeText(text);

      toast({
        title: t('playersPage.copyDebtorsToast.successTitle'),
        description: t('playersPage.copyDebtorsToast.successDesc'),
      });
    } catch (err) {
      console.error('Failed to copy debtors summary:', err);
      toast({
        variant: 'destructive',
        title: t('playersPage.copyDebtorsToast.errorTitle'),
        description: t('playersPage.copyDebtorsToast.errorDesc'),
      });
    }
  };


  const activePlayers = (players ?? []).filter((p) => p.active !== false);
  const inactivePlayers = (players ?? []).filter((p) => p.active === false);

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
          <AlertTitle>{t('playersPage.errorLoadingTitle')}</AlertTitle>
          <AlertDescription>
            {error.message || t('playersPage.errorLoadingDesc')}
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
              {t('playersPage.title')}
            </h1>
            <Button onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('playersPage.addPlayer')}
            </Button>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{t('playersPage.activePlayers')}</CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyDebtorsClick}
                title={t('playersPage.copyDebtorsTitle')}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="sr-only">{t('playersPage.copyDebtorsSrOnly')}</span>
              </Button>
            </CardHeader>
            <CardContent>
              <PlayersTable
                players={activePlayers}
                lastActivityByUser={lastActivityByUser}
                beverageCountByUser={beverageCountByUser}
                paymentSparklineByUser={paymentSparklineByUser}
                balanceBreakdownByUser={balanceBreakdownByUser}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onToggleStatus={handleToggleStatus}
                emptyMessage={t('playersPage.emptyActive')}
                sortState={sortState}
                onSortChange={handleTableSortChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('playersPage.inactivePlayers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayersTable
                players={inactivePlayers}
                lastActivityByUser={lastActivityByUser}
                beverageCountByUser={beverageCountByUser}
                paymentSparklineByUser={paymentSparklineByUser}
                balanceBreakdownByUser={balanceBreakdownByUser}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onToggleStatus={handleToggleStatus}
                emptyMessage={t('playersPage.emptyInactive')}
                sortState={sortState}
                onSortChange={handleTableSortChange}
              />
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
