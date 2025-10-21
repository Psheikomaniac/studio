
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Beverage } from "@/lib/types";
import { beverages as staticBeverages } from '@/lib/static-data';

export default function BeveragesPage() {
  const [beverages] = useState<Beverage[]>(staticBeverages);

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
           <div className="flex items-center justify-between">
            <h1 className="font-headline text-3xl font-bold">Beverage List</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Available Beverages & Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beverage</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beverages?.map((beverage) => (
                    <TableRow key={beverage.id}>
                      <TableCell className="font-medium">{beverage.name}</TableCell>
                      <TableCell className="text-right">€{beverage.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {beverages?.length === 0 && (
                  <div className="text-center p-8 text-muted-foreground">
                      No beverages found.
                  </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
