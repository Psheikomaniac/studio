import { useMemo } from 'react';
import { Payment, Fine, DuePayment } from '@/lib/types';
import { isBeverageFine } from '@/lib/types';

export function usePlayerStats(
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[],
) {
  const lastActivityByUser = useMemo(() => {
    const map = new Map<string, string>();
    const setIfMax = (userId?: string, date?: string) => {
      if (!userId || !date) return;
      const t = new Date(date).getTime();
      const prev = map.get(userId);
      if (!prev || t > new Date(prev).getTime()) map.set(userId, date);
    };
    fines.forEach(f => setIfMax(f.userId, f.date));
    payments.forEach(p => setIfMax(p.userId, p.date));
    duePayments.forEach(d => setIfMax(d.userId, d.createdAt));
    return map;
  }, [fines, payments, duePayments]);

  const beverageCountByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fines) {
      if (!f?.userId || !isBeverageFine(f)) continue;
      m.set(f.userId, (m.get(f.userId) ?? 0) + 1);
    }
    return m;
  }, [fines]);

  // Build last 6 months keys and labels
  const last6Months = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const d = new Date();
    d.setDate(1); // normalize to first of month
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleString(undefined, { month: 'short' });
      arr.push({ key, label });
    }
    return arr;
  }, []);

  // Payments per user per month (last 6 months)
  const paymentSparklineByUser = useMemo(() => {
    const map = new Map<string, number[]>();
    const indexByMonth = new Map(last6Months.map((m, idx) => [m.key, idx] as const));
    for (const p of payments) {
      if (!p?.userId || !p?.date) continue;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const idx = indexByMonth.get(key);
      if (idx == null) continue; // outside 6m window
      const arr = map.get(p.userId) || Array(6).fill(0);
      arr[idx] += Number(p.amount) || 0;
      map.set(p.userId, arr);
    }
    return map;
  }, [payments, last6Months]);

  return {
    lastActivityByUser,
    beverageCountByUser,
    paymentSparklineByUser,
  };
}
