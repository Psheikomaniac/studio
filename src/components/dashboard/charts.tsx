"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fine } from "@/lib/types";
import { useTranslation } from 'react-i18next';

interface DashboardChartsProps {
  fines: Fine[];
}

export function DashboardCharts({ fines }: DashboardChartsProps) {
  const { t, i18n } = useTranslation();
  const finesPerMonth = fines.reduce((acc, fine) => {
    const month = new Date(fine.date).toLocaleString(i18n.language, { month: 'short', year: '2-digit' });
    const existing = acc.find(item => item.name === month);
    if (existing) {
      existing.total += fine.amount;
    } else {
      acc.push({ name: month, total: fine.amount });
    }
    return acc;
  }, [] as { name: string; total: number }[]);

  // Sort by date logic would be more complex, for now we just show what we have.
  // A real app would sort this chronologically.

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="font-headline">{t('charts.fineStatistics')}</CardTitle>
        <CardDescription>{t('charts.totalFinesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={finesPerMonth}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--secondary))' }}
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
              }}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
