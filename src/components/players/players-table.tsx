import React from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/lib/types';
import { BalanceBreakdown } from '@/hooks/use-player-balances';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';
import { PlayerSparkline } from './player-sparkline';
import { BalanceTooltip } from './balance-tooltip';
import { PlayerActions } from './player-actions';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type PlayersTableSortableColumn =
  | 'name'
  | 'nickname'
  | 'lastActivity'
  | 'beverages'
  | 'payments'
  | 'balance';

export type PlayersTableSortDirection = 'asc' | 'desc';

export interface PlayersTableSortState {
  column: PlayersTableSortableColumn | 'id';
  direction: PlayersTableSortDirection;
}

interface PlayersTableProps {
  players: Player[];
  lastActivityByUser: Map<string, string>;
  beverageCountByUser: Map<string, number>;
  paymentSparklineByUser: Map<string, number[]>;
  balanceBreakdownByUser: Map<string, BalanceBreakdown>;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  onToggleStatus: (player: Player) => void;
  /**
   * Optional leer-Text, wenn keine Spieler vorhanden sind.
   * Falls nicht gesetzt, wird eine lokalisierte Standardnachricht verwendet.
   */
  emptyMessage?: string;
  sortState?: PlayersTableSortState | null;
  onSortChange?: (column: PlayersTableSortableColumn) => void;
}

export function PlayersTable({
  players,
  lastActivityByUser,
  beverageCountByUser,
  paymentSparklineByUser,
  balanceBreakdownByUser,
  onEdit,
  onDelete,
  onToggleStatus,
  emptyMessage,
  sortState,
  onSortChange,
}: PlayersTableProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const effectiveEmptyMessage = emptyMessage ?? t('playersPage.table.empty');

  const renderSortIndicator = (column: PlayersTableSortableColumn) => {
    if (!sortState) return null;
    if (sortState.column === 'id') return null;
    if (sortState.column !== column) return null;

    return (
      <span className="ml-1 text-xs" aria-hidden="true">
        {sortState.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const handleNicknameDoubleClick = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(name);
      toast({
        title: t('playersPage.nicknameCopyToast.title'),
        description: t('playersPage.nicknameCopyToast.description', { name }),
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        variant: "destructive",
        title: t('playersPage.nicknameCopyToast.errorTitle'),
        description: t('playersPage.nicknameCopyToast.errorDesc'),
      });
    }
  };

  if (players.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {effectiveEmptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden w-[100px] sm:table-cell">
            <span className="sr-only">{t('playersPage.table.image')}</span>
          </TableHead>
          <TableHead>
            <button
              type="button"
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => onSortChange && onSortChange('name')}
            >
              <span>{t('playersPage.table.name')}</span>
              {renderSortIndicator('name')}
            </button>
          </TableHead>
          <TableHead>
            <button
              type="button"
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => onSortChange && onSortChange('nickname')}
            >
              <span>{t('playersPage.table.nickname')}</span>
              {renderSortIndicator('nickname')}
            </button>
          </TableHead>
          <TableHead>
            <button
              type="button"
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => onSortChange && onSortChange('lastActivity')}
            >
              <span>{t('playersPage.table.lastActivity')}</span>
              {renderSortIndicator('lastActivity')}
            </button>
          </TableHead>
          <TableHead>
            <button
              type="button"
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => onSortChange && onSortChange('beverages')}
            >
              <span>{t('playersPage.table.beverages')}</span>
              {renderSortIndicator('beverages')}
            </button>
          </TableHead>
          <TableHead>
            <button
              type="button"
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => onSortChange && onSortChange('payments')}
            >
              <span>{t('playersPage.table.payments')}</span>
              {renderSortIndicator('payments')}
            </button>
          </TableHead>
          <TableHead
            className="text-right"
            title={t('playersPage.balanceTooltip.formula')}
          >
            <button
              type="button"
              className="flex items-center justify-end gap-1 w-full cursor-pointer select-none"
              onClick={() => onSortChange && onSortChange('balance')}
            >
              <span>{t('playersPage.table.balance')}</span>
              {renderSortIndicator('balance')}
            </button>
          </TableHead>
          <TableHead className="w-[140px] text-right">
            <span className="sr-only">{t('playersPage.table.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const balance = player.balance;
          const lastActivity = lastActivityByUser.get(player.id);
          const tooOld = lastActivity ? ((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24) > 90) : false;
          const isInactive = player.active === false;
          const showInactiveBadge = isInactive || tooOld;

          return (
            <TableRow key={player.id}>
              <TableCell className="hidden sm:table-cell">
                <a href={`/players/${player.id}`} className="inline-block">
                  <Image
                    alt={t('playersPage.table.imageAlt', { name: player.name })}
                    className="aspect-square rounded-full object-cover"
                    height="40"
                    src={
                      player.photoUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        player.name,
                      )}&size=40&background=94a3b8&color=fff`
                    }
                    width="40"
                  />
                </a>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <a href={`/players/${player.id}`} className="hover:underline">{player.name}</a>
                  {showInactiveBadge && (
                    <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300">
                      {t('playersPage.table.inactiveBadge')}
                    </Badge>
                  )}
                  {balance < -50 && (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                      {t('playersPage.table.riskBadge')}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell
                className="cursor-copy select-none"
                onDoubleClick={(e) => handleNicknameDoubleClick(e, player.name)}
                title="Doppelklick zum Kopieren des vollständigen Namens"
              >
                {player.nickname}
              </TableCell>
              <TableCell>
                {lastActivity ? <SafeLocaleDate dateString={lastActivity} /> : '-'}
              </TableCell>
              <TableCell>{beverageCountByUser.get(player.id) ?? 0}</TableCell>
              <TableCell className="w-[120px]">
                <PlayerSparkline data={paymentSparklineByUser.get(player.id) || []} />
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${balance > 0
                    ? 'text-positive'
                    : balance < 0
                      ? 'text-destructive'
                      : 'text-foreground'
                  }`}
              >
                <BalanceTooltip
                  breakdown={balanceBreakdownByUser.get(player.id)}
                  balance={balance}
                />
              </TableCell>
              <TableCell className="text-right">
                <PlayerActions
                  player={player}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
