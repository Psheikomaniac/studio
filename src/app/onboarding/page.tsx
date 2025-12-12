'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useUser } from '@/firebase/provider';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firebase = useFirebaseOptional();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.isAnonymous) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const handleLogout = async () => {
    if (!firebase?.auth) return;
    await signOut(firebase.auth);
  };

  if (isUserLoading) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Team einrichten</CardTitle>
          <CardDescription>
            Du bist aktuell noch keinem Team zugeordnet oder hast kein Team ausgewählt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">
            Dieser Schritt wird im nächsten Arbeitspaket (Onboarding: Team erstellen / beitreten) umgesetzt.
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
