'use client';

import { AuthGuard } from '@/components/auth-guard';
import { TeamProvider } from '@/team';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <TeamProvider>{children}</TeamProvider>
    </AuthGuard>
  );
}
