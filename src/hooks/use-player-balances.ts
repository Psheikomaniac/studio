import { useMemo } from 'react';
import { Payment, Fine, Due, DuePayment, PaymentCategory } from '@/lib/types';
import { isBeverageFine } from '@/lib/types';

export type BalanceBreakdown = {
  guthaben: number;
  guthabenRest: number;
  fines: number;
  dues: number;
  beverages: number;
  totalCredits: number;
  totalLiabilities: number;
  balance: number;
};

export function usePlayerBalances(
  payments: Payment[],
  fines: Fine[],
  duePayments: DuePayment[],
  dues: Due[] = []
) {
  const dueById = useMemo(() => {
    const m = new Map<string, Due>();
    (dues || []).forEach(d => m.set(d.id, d));
    return m;
  }, [dues]);

  return useMemo(() => {
    const m = new Map<string, BalanceBreakdown>();
    const ensure = (userId: string) => {
      let v = m.get(userId);
      if (!v) {
        v = { guthaben: 0, guthabenRest: 0, fines: 0, dues: 0, beverages: 0, totalCredits: 0, totalLiabilities: 0, balance: 0 };
        m.set(userId, v);
      }
      return v;
    };

    const norm = (s?: string) => (s || '').trim().toLowerCase();

    // Credits: Guthaben + Guthaben Rest (nur offene/unbezahlte Credits werden berücksichtigt)
    for (const p of payments) {
      if (!p?.userId) continue;
      if (p.paid) continue; // nur unpaid Guthaben/Guthaben Rest zählen
      const r = norm(p.reason);
      const amt = Number(p.amount) || 0;

      // Robustere Klassifikation via Category
      if (p.category === PaymentCategory.DEPOSIT || p.category === PaymentCategory.PAYMENT) {
          ensure(p.userId).guthaben += amt;
          continue;
      }
      // Wenn Category gesetzt ist (z.B. TRANSFER), aber wir es oben nicht behandelt haben:
      if (p.category) {
          continue;
      }

      // Fallback: String Matching
      if (r === 'guthaben rest' || r.includes('guthaben rest')) {
        ensure(p.userId).guthabenRest += amt;
      } else if (r === 'guthaben' || r.includes('guthaben') || r.startsWith('einzahlung')) {
        ensure(p.userId).guthaben += amt;
      }
    }

    // Fines: Split by fineType — regular fines vs beverage fines
    for (const f of fines) {
      if (!f?.userId) continue;
      let remaining = 0;
      if (!f.paid) {
        const amt = Number(f.amount) || 0;
        const amtPaid = Number(f.amountPaid || 0);
        remaining = Math.max(0, amt - amtPaid);
      }
      if (isBeverageFine(f)) {
        ensure(f.userId).beverages += remaining;
      } else {
        ensure(f.userId).fines += remaining;
      }
    }

    // Dues: Nur offene Restbeträge (exempt ausgeschlossen) und nur für nicht archivierte Dues
    for (const d of duePayments) {
      if (!d?.userId || d.exempt) continue;
      const meta = dueById.get(d.dueId);
      // Wenn Metadaten vorhanden sind, nur aktive und nicht archivierte Dues zählen
      if (meta && (meta.archived || meta.active === false)) continue;
      let remaining = 0;
      if (!d.paid) {
        const amt = Number(d.amountDue) || 0;
        const amtPaid = Number(d.amountPaid || 0);
        remaining = Math.max(0, amt - amtPaid);
      }
      ensure(d.userId).dues += remaining;
    }

    // Final totals per user
    for (const [, v] of m) {
      v.totalCredits = (v.guthaben || 0) + (v.guthabenRest || 0);
      v.totalLiabilities = (v.fines || 0) + (v.dues || 0) + (v.beverages || 0);
      v.balance = v.totalCredits - v.totalLiabilities;
    }

    return m;
  }, [payments, fines, duePayments, dueById]);
}
