
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Payment, Player } from "@/lib/types";
import { payments as staticPayments, players as staticPlayers } from '@/lib/static-data';

export default function PaymentsPage() {
  const [payments] = useState<Payment[]>(staticPayments);
  const [players] = useState<Player[]>(staticPlayers);

  const getPlayerName = (id: string) => players?.find(p => p.id === id)?.name || 'Unknown';

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
           <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">One-Time Payments</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.reason}</TableCell>
                      <TableCell>{payment.userId ? getPlayerName(payment.userId) : 'N/A'}</TableCell>
                      <TableCell className="text-right">€{payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {payment.paid ? (
                          <Badge variant="outline" className="text-positive border-positive/50">
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Open
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {payments?.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                      No payments found.
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
