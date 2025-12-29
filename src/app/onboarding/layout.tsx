'use client';

import { AuthGuard } from '@/components/auth-guard';
import { TeamProvider } from '@/team';
import { ClubProvider } from '@/club/club-provider';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ClubProvider>
        <TeamProvider>{children}</TeamProvider>
      </ClubProvider>
    </AuthGuard>
  );
}
