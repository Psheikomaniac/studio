
'use client';

// Force dynamic rendering since this page uses Firebase hooks
export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Player } from '@/lib/types';
import { usePlayers, usePlayersService } from '@/services/players.service';
import { AddEditPlayerDialog } from '@/components/players/add-edit-player-dialog';
import { DeletePlayerDialog } from '@/components/players/delete-player-dialog';
import { useToast } from "@/hooks/use-toast";
import { PlayersTable } from '@/components/players/players-table';
import { useAllFines, useAllPayments, useAllDuePayments, useAllBeverageConsumptions } from '@/hooks/use-all-transactions';
import { usePlayerBalances } from '@/hooks/use-player-balances';
import { usePlayerStats } from '@/hooks/use-player-stats';
import { dues as staticDues } from '@/lib/static-data';
import { useTranslation } from 'react-i18next';

export default function PlayersPage() {
  const { t } = useTranslation();

  // Firebase hooks for real-time data
  const { data: playersData, isLoading: playersLoading, error } = usePlayers();
  const playersService = usePlayersService();

  // Load all transaction data
  const { data: finesData, isLoading: finesLoading } = useAllFines();
  const { data: paymentsData, isLoading: paymentsLoading } = useAllPayments();
  const { data: duePaymentsData, isLoading: duePaymentsLoading } = useAllDuePayments();
  const { data: consumptionsData, isLoading: consumptionsLoading } = useAllBeverageConsumptions();

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

  // Update players with correct calculated balances from balanceBreakdownByUser
  const players = useMemo(() => {
    if (!playersData) return [];

    return playersData.map(player => ({
      ...player,
      balance: balanceBreakdownByUser.get(player.id)?.balance || 0
    })).sort((a, b) => a.balance - b.balance);
  }, [playersData, balanceBreakdownByUser]);

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
            <CardHeader>
              <CardTitle>{t('playersPage.activePlayers')}</CardTitle>
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
