import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fines, players } from "@/lib/data";
import { CheckCircle2, XCircle } from "lucide-react";

export default function FinesPage() {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4">
        <h1 className="font-headline text-3xl font-bold">Fines</h1>
        <Card>
          <CardHeader>
            <CardTitle>All Fines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fines.map((fine) => (
                  <TableRow key={fine.id}>
                    <TableCell className="font-medium">{fine.description}</TableCell>
                    <TableCell>{fine.playerIds.map(getPlayerName).join(', ')}</TableCell>
                    <TableCell className="text-right">€{fine.amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(fine.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {fine.status === 'paid' ? (
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
