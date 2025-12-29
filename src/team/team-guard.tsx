'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTeam } from './team-provider';
import { Button } from '@/components/ui/button';

export function TeamGuard({ children }: { children: React.ReactNode }) {
  const { teamId, isTeamLoading, teamError } = useTeam();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isTeamLoading || teamError) return;
    if (!teamId && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
    if (teamId && pathname === '/onboarding') {
      router.push('/dashboard');
    }
  }, [isTeamLoading, teamId, teamError, pathname, router]);

  if (isTeamLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teamError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Ein Fehler ist aufgetreten</h2>
        <p className="max-w-md text-center text-muted-foreground">
          {teamError.message}
        </p>
        {teamError.message.includes('index') && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                Datenbank-Index fehlt. Bitte Link in der Browser-Konsole prüfen.
            </p>
        )}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Neu laden
        </Button>
      </div>
    );
  }

  if (!teamId) {
    return null;
  }

  return <>{children}</>;
}
