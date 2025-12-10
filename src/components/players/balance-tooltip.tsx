import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatEuro } from '@/lib/csv-utils';
import { BalanceBreakdown } from '@/hooks/use-player-balances';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface BalanceTooltipProps {
  breakdown?: BalanceBreakdown;
  balance: number;
}

export function BalanceTooltip({ breakdown, balance }: BalanceTooltipProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const g = breakdown?.guthaben ?? 0;
  const gr = breakdown?.guthabenRest ?? 0;
  const f = breakdown?.fines ?? 0;
  const d = breakdown?.dues ?? 0;
  const b = breakdown?.beverages ?? 0;

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(formatEuro(Math.abs(balance)));
      toast({
        title: t('playersPage.balanceTooltip.copyToast.title'),
        description: t('playersPage.balanceTooltip.copyToast.description'),
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        variant: "destructive",
        title: t('playersPage.balanceTooltip.copyToast.errorTitle'),
        description: t('playersPage.balanceTooltip.copyToast.errorDesc'),
      });
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="cursor-help select-none"
            onDoubleClick={handleDoubleClick}
          >
            {formatEuro(Math.abs(balance))}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="end">
          <div className="text-xs">
            <div className="font-medium mb-1">{t('playersPage.balanceTooltip.title')}</div>
            <div className="mb-1">{t('playersPage.balanceTooltip.formula')}</div>
            <div className="text-muted-foreground mb-1">{t('playersPage.balanceTooltip.explanation')}</div>
            <div className="font-mono">
              {t('playersPage.balanceTooltip.guthabenOpen')}: {formatEuro(g)} • {t('playersPage.balanceTooltip.guthabenRestOpen')}: {formatEuro(gr)}<br />
              {t('playersPage.balanceTooltip.finesOpen')}: {formatEuro(f)} • {t('playersPage.balanceTooltip.duesOpen')}: {formatEuro(d)} • {t('playersPage.balanceTooltip.beveragesOpen')}: {formatEuro(b)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
