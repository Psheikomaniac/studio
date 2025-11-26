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
import { useToast } from "@/hooks/use-toast";

interface PlayersTableProps {
  players: Player[];
  lastActivityByUser: Map<string, string>;
  beverageCountByUser: Map<string, number>;
  paymentSparklineByUser: Map<string, number[]>;
  balanceBreakdownByUser: Map<string, BalanceBreakdown>;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  onToggleStatus: (player: Player) => void;
  emptyMessage?: string;
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
  emptyMessage = "No players."
}: PlayersTableProps) {
  const { toast } = useToast();

  const handleNicknameDoubleClick = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(name);
      toast({
        title: "Kopiert",
        description: `"${name}" wurde in die Zwischenablage kopiert.`,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Konnte nicht kopiert werden.",
      });
    }
  };

  if (players.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
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
                  {showInactiveBadge && (
                    <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300">Inaktiv</Badge>
                  )}
                  {balance < -50 && (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">Risiko</Badge>
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
