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

export type MonthlyCohortPoint = { month: string; firstPayers: number; revenue: number; cumulativeRevenue: number };

function toMonthKey(d: Date): string {
  // YYYY-MM
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function movingAverage(series: DayPoint[], window: number): DayPoint[] {
  if (!Array.isArray(series) || series.length === 0 || window <= 1) return series.slice();
  const values = series.map(p => p.value);
  const out: DayPoint[] = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += values[i];
    if (i >= window) {
      sum -= values[i - window];
    }
    const count = i + 1 < window ? i + 1 : window;
    out.push({ date: series[i].date, value: sum / count });
  }
  return out;
}

export function buildFirstPayersAndCumulativeRevenueByMonth(payments: Payment[]): MonthlyCohortPoint[] {
  const firstPayDateByUser = new Map<string, Date>();
  const revenueByMonth = new Map<string, number>();

  // Determine first payment date per user and sum revenue per month
  for (const p of payments) {
    if (!p?.date || typeof p.amount !== 'number') continue;
    const d = new Date(p.date);
    if (isNaN(d.getTime())) continue;
    const key = toMonthKey(d);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (Number(p.amount) || 0));

    if (p.userId) {
      const prev = firstPayDateByUser.get(p.userId);
      if (!prev || d < prev) firstPayDateByUser.set(p.userId, d);
    }
  }

  // Count first payers per month
  const firstPayersByMonth = new Map<string, number>();
  for (const [, d] of firstPayDateByUser) {
    const key = toMonthKey(d);
    firstPayersByMonth.set(key, (firstPayersByMonth.get(key) ?? 0) + 1);
  }

  // Build sorted set of months present in either map
  const months = Array.from(new Set<string>([...revenueByMonth.keys(), ...firstPayersByMonth.keys()]))
    .sort((a, b) => a.localeCompare(b));

  const result: MonthlyCohortPoint[] = [];
  let cumulative = 0;
  for (const m of months) {
    const rev = revenueByMonth.get(m) ?? 0;
    cumulative += rev;
    result.push({
      month: m,
      firstPayers: firstPayersByMonth.get(m) ?? 0,
      revenue: rev,
      cumulativeRevenue: cumulative,
    });
  }

  return result;
}
