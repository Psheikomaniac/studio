'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { PredefinedFine } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const firestore = useFirestore();

  const predefinedFinesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'predefinedFines')) : null),
    [firestore]
  );
  const { data: predefinedFines, isLoading } = useCollection<PredefinedFine>(predefinedFinesQuery);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4">
        <h1 className="font-headline text-3xl font-bold">Settings</h1>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Predefined Fines</CardTitle>
              <CardDescription>Manage the standard fines for your team.</CardDescription>
            </div>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Fine
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && predefinedFines?.map((fine) => (
                  <TableRow key={fine.id}>
                    <TableCell className="font-medium">{fine.reason}</TableCell>
                    <TableCell className="text-right">€{fine.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {!isLoading && predefinedFines?.length === 0 && (
                <div className="text-center p-8 text-muted-foreground">
                    No predefined fines found.
                </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>General team settings.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground">Team settings will be available here.</p>
          </CardContent>
        </Card>

         <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
             <Button variant="destructive">Reset All Balances</Button>
             <Button variant="outline">Delete All Data</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
