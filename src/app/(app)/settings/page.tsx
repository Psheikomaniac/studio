
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4">
        <h1 className="font-headline text-3xl font-bold">Settings</h1>
        
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
