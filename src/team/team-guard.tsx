'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTeam } from './team-provider';

export function TeamGuard({ children }: { children: React.ReactNode }) {
  const { teamId, isTeamLoading } = useTeam();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isTeamLoading) return;
    if (!teamId && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [isTeamLoading, teamId, pathname, router]);

  if (isTeamLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teamId) {
    return null;
  }

  return <>{children}</>;
}
