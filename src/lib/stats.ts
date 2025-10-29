import type { Payment, Fine } from '@/lib/types';

export type DayPoint = { date: string; value: number };

function toISODate(dateStr: string): string {
  // Expecting ISO or parseable date string; return YYYY-MM-DD
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function groupPaymentsByDay(payments: Payment[], start?: Date, end?: Date): DayPoint[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    if (!p?.date || typeof p.amount !== 'number') continue;
    const d = new Date(p.date);
    if (isNaN(d.getTime())) continue;
    if (start && d < start) continue;
    if (end && d > end) continue;
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + (Number(p.amount) || 0));
  }
  // Sort by date asc
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

export function sumPaymentsInLastDays(payments: Payment[], days: number): number {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return payments.reduce((sum, p) => {
    if (!p?.date) return sum;
    const d = new Date(p.date);
    if (isNaN(d.getTime())) return sum;
    if (d >= new Date(start.toDateString()) && d <= end) {
      return sum + (Number(p.amount) || 0);
    }
    return sum;
  }, 0);
}

export function sumPaymentsToday(payments: Payment[]): number {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);
  return payments.reduce((sum, p) => {
    const key = toISODate(p?.date || '');
    if (!key) return sum;
    if (key === ymd) sum += Number(p.amount) || 0;
    return sum;
  }, 0);
}

export function computeARPPU(payments: Payment[], days: number): number {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  let revenue = 0;
  const payers = new Set<string>();
  for (const p of payments) {
    if (!p?.date) continue;
    const d = new Date(p.date);
    if (isNaN(d.getTime())) continue;
    if (d >= new Date(start.toDateString()) && d <= end) {
      revenue += Number(p.amount) || 0;
      if (p.userId) payers.add(p.userId);
    }
  }
  const denom = Math.max(1, payers.size);
  return revenue / denom;
}

export function computeOpenFinesTotal(fines: Fine[]): number {
  return fines.reduce((sum, f) => {
    if (!f) return sum;
    if (f.paid) return sum;
    const amount = Number(f.amount) || 0;
    const amountPaid = Number(f.amountPaid || 0) || 0;
    return sum + Math.max(0, amount - amountPaid);
  }, 0);
}

export function maxDateOfStrings(dates: (string | undefined | null)[]): string | null {
  let maxT = -Infinity;
  let maxStr: string | null = null;
  for (const ds of dates) {
    if (!ds) continue;
    const t = new Date(ds).getTime();
    if (!isNaN(t) && t > maxT) {
      maxT = t;
      maxStr = new Date(t).toISOString();
    }
  }
  return maxStr;
}

export function maxDateFromCollections(collections: Array<Array<{ date?: string; createdAt?: string }>>): string | null {
  const dates: string[] = [];
  for (const col of collections) {
    for (const item of col) {
      if (item?.date) dates.push(item.date);
      else if (item?.createdAt) dates.push(item.createdAt);
    }
  }
  return maxDateOfStrings(dates);
}
