
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { transactions as staticTransactions, players as staticPlayers } from '@/lib/static-data';
import type { Transaction, Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';

export default function TransactionsPage() {
    const [transactions] = useState<Transaction[]>(staticTransactions);
    const [players] = useState<Player[]>(staticPlayers);

    const getPlayerName = (id: string) => players?.find(p => p.id === id)?.name || 'Unknown';

    const sortedTransactions = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="font-headline text-3xl font-bold">Transaction Log</h1>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>All Transactions</CardTitle>
                        <CardDescription>A complete history of all financial activities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Player</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTransactions.map((trx) => (
                                    <TableRow key={trx.id}>
                                        <TableCell>{getPlayerName(trx.userId)}</TableCell>
                                        <TableCell className="font-medium">{trx.description}</TableCell>
                                        <TableCell>
                                            <SafeLocaleDate dateString={trx.date} options={{ hour: '2-digit', minute: '2-digit' }} />
                                        </TableCell>
                                        <TableCell className={cn("text-right font-semibold flex items-center justify-end gap-1", trx.amount < 0 ? "text-destructive" : "text-positive")}>
                                            {trx.amount < 0 ? <ArrowDownCircle className="h-4 w-4"/> : <ArrowUpCircle className="h-4 w-4"/>}
                                            €{Math.abs(trx.amount).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         {transactions?.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground">
                                No transactions found.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
