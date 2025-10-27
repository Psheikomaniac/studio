
"use client";

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, MoreHorizontal } from "lucide-react";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DuePayment, Due, Player } from "@/lib/types";
import { SafeLocaleDate } from '@/components/shared/safe-locale-date';

type DuePaymentsTableProps = {
  duePayments: DuePayment[];
  dues: Due[];
  players: Player[];
  onDelete: (paymentId: string) => void;
  onToggleStatus: (paymentId: string, newStatus: 'paid' | 'exempt' | 'pending') => void;
};

export function DuePaymentsTable({ duePayments, dues, players, onDelete, onToggleStatus }: DuePaymentsTableProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");

  const getDueName = (dueId: string) => dues?.find(d => d.id === dueId)?.name || 'Unknown';

  const filteredPayments = selectedPlayer === "all"
    ? duePayments
    : duePayments.filter(p => p.userId === selectedPlayer);

  const getStatusBadge = (payment: DuePayment) => {
    if (payment.paid) {
      return (
        <Badge variant="outline" className="text-positive border-positive/50">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Paid
        </Badge>
      );
    }
    if (payment.exempt) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600/50">
          <MinusCircle className="mr-1 h-3.5 w-3.5" />
          Exempt
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
        <XCircle className="mr-1 h-3.5 w-3.5" />
        Pending
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Player</TableHead>
            <TableHead>Due Name</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid Date</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.userName}</TableCell>
              <TableCell>{getDueName(payment.dueId)}</TableCell>
              <TableCell className="text-right">€{payment.amountDue.toFixed(2)}</TableCell>
              <TableCell>{getStatusBadge(payment)}</TableCell>
              <TableCell>
                {payment.paidAt ? (
                  <SafeLocaleDate dateString={payment.paidAt} />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {!payment.paid && (
                      <DropdownMenuItem onClick={() => onToggleStatus(payment.id, 'paid')}>
                        Mark as paid
                      </DropdownMenuItem>
                    )}
                    {!payment.exempt && (
                      <DropdownMenuItem onClick={() => onToggleStatus(payment.id, 'exempt')}>
                        Mark as exempt
                      </DropdownMenuItem>
                    )}
                    {(payment.paid || payment.exempt) && (
                      <DropdownMenuItem onClick={() => onToggleStatus(payment.id, 'pending')}>
                        Mark as pending
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(payment.id)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredPayments.length === 0 && (
        <div className="text-center p-8 text-muted-foreground">
          No due payments found.
        </div>
      )}
    </div>
  );
}
