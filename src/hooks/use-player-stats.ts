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

  // Build last 6 months keys and labels, anchored to the most recent payment month.
  // When all payment data is older than 6 months (e.g. historical CSV imports), the
  // window shifts to cover the 6 months up to the latest payment so the sparkline
  // is never empty just because data predates today's rolling window.
  const last6Months = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Find the most recent payment month key (YYYY-MM)
    let latestPaymentMonth: string | null = null;
    for (const p of payments) {
      if (!p.date) continue;
      const d = new Date(p.date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!latestPaymentMonth || key > latestPaymentMonth) latestPaymentMonth = key;
    }

    // Compute the earliest month of the current 6-month window
    const earliest = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const earliestKey = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}`;

    // If all payments predate the current window, anchor to the latest payment month
    let anchor = currentMonth;
    if (latestPaymentMonth && latestPaymentMonth < earliestKey) {
      const [year, month] = latestPaymentMonth.split('-').map(Number);
      anchor = new Date(year, month - 1, 1);
    }

    const arr: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleString(undefined, { month: 'short' });
      arr.push({ key, label });
    }
    return arr;
  }, [payments]);

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
