import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { Player } from '@/lib/types';

interface PlayerActionsProps {
  player: Player;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  onToggleStatus: (player: Player) => void;
}

export function PlayerActions({ player, onEdit, onDelete, onToggleStatus }: PlayerActionsProps) {
  const isActive = player.active !== false;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        aria-label="Edit player"
        title="Edit"
        onClick={() => onEdit(player)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={isActive ? "Set inactive" : "Set active"}
        title={isActive ? "Set inactive" : "Set active"}
        onClick={() => onToggleStatus(player)}
      >
        {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        aria-label="Delete player"
        title="Delete"
        onClick={() => onDelete(player)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
