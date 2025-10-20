"use client";

import type { Player, Fine } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CircleAlert } from "lucide-react";

type StatsProps = {
  players: Player[];
  fines: Fine[];
};

export function Stats({ players, fines }: StatsProps) {
  const totalDebt = players
    .filter((p) => p.balance < 0)
    .reduce((sum, p) => sum + p.balance, 0);

  const totalCredit = players
    .filter((p) => p.balance > 0)
    .reduce((sum, p) => sum + p.balance, 0);
  
  const openFines = fines.filter(f => f.status === 'open').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
          <TrendingUp className="h-4 w-4 text-positive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-positive">
            €{totalCredit.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total amount owed to players.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            €{Math.abs(totalDebt).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total outstanding fines.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Fines</CardTitle>
          <CircleAlert className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openFines}</div>
          <p className="text-xs text-muted-foreground">
            Number of fines waiting for payment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
