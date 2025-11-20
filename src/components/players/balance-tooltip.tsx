import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatEuro } from "@/lib/csv-utils";
import { BalanceBreakdown } from '@/hooks/use-player-balances';

interface BalanceTooltipProps {
  breakdown?: BalanceBreakdown;
  balance: number;
}

export function BalanceTooltip({ breakdown, balance }: BalanceTooltipProps) {
  const g = breakdown?.guthaben ?? 0;
  const gr = breakdown?.guthabenRest ?? 0;
  const f = breakdown?.fines ?? 0;
  const d = breakdown?.dues ?? 0;
  const b = breakdown?.beverages ?? 0;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{formatEuro(Math.abs(balance))}</span>
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
}
