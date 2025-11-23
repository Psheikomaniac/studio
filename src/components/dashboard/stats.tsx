"use client";

import type { Player, Fine } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CircleAlert } from "lucide-react";
import { formatEuro } from "@/lib/csv-utils";
import { useTranslation } from 'react-i18next';

type StatsProps = {
  players: Player[];
  fines: Fine[];
};

export function Stats({ players, fines }: StatsProps) {
  const { t } = useTranslation();
  const totalDebt = players
    .filter((p) => p.balance < 0)
    .reduce((sum, p) => sum + p.balance, 0);

  const totalCredit = players
    .filter((p) => p.balance > 0)
    .reduce((sum, p) => sum + p.balance, 0);

  const openFines = fines.filter(f => !f.paid).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.totalCredit')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-positive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-positive">
            {formatEuro(totalCredit)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('stats.totalCreditDesc')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.totalDebt')}</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatEuro(Math.abs(totalDebt))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('stats.totalDebtDesc')}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.openFines')}</CardTitle>
          <CircleAlert className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openFines}</div>
          <p className="text-xs text-muted-foreground">
            {t('stats.openFinesDesc')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
