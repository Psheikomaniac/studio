'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useUser } from '@/firebase/provider';
import { useFirebaseOptional } from '@/firebase/use-firebase-optional';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { TeamsService } from '@/services/teams.service';
import { useTeam } from '@/team';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firebase = useFirebaseOptional();
  const { teamId, isTeamLoading, setTeamId } = useTeam();
  const { toast } = useToast();

  const [createTeamName, setCreateTeamName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamsService = useMemo(() => {
    if (!firebase?.firestore) return null;
    return new TeamsService(firebase.firestore);
  }, [firebase?.firestore]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.isAnonymous) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (isUserLoading || isTeamLoading) return;
    if (teamId) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isTeamLoading, teamId, router]);

  const handleLogout = async () => {
    if (!firebase?.auth) return;
    await signOut(firebase.auth);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamsService || !user) return;

    const name = createTeamName.trim();
    if (!name) {
      toast({
        title: 'Teamname fehlt',
        description: 'Bitte gib einen Teamnamen ein.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await teamsService.createTeam({ name, ownerUid: user.uid });
      if (!result.success || !result.data) {
        throw result.error ?? new Error('Team konnte nicht erstellt werden.');
      }

      setTeamId(result.data.team.id);

      toast({
        title: 'Team erstellt',
        description: `Einladungscode: ${result.data.team.inviteCode}`,
      });

      router.push('/dashboard');
    } catch (err) {
      toast({
        title: 'Fehler beim Erstellen',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamsService || !user) return;

    setIsSubmitting(true);
    try {
      const result = await teamsService.joinTeamByInviteCode({ inviteCode: joinInviteCode, uid: user.uid });
      if (!result.success || !result.data) {
        throw result.error ?? new Error('Beitritt fehlgeschlagen.');
      }

      setTeamId(result.data.teamId);
      toast({
        title: 'Team beigetreten',
        description: `Invite-Code: ${result.data.inviteCode}`,
      });
      router.push('/dashboard');
    } catch (err) {
      toast({
        title: 'Fehler beim Beitreten',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isTeamLoading) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Team einrichten</CardTitle>
          <CardDescription>
            Erstelle ein neues Team oder tritt einem bestehenden Team per Invite-Code bei.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Team erstellen</TabsTrigger>
              <TabsTrigger value="join">Team beitreten</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-4">
              <form className="flex flex-col gap-3" onSubmit={handleCreateTeam}>
                <div className="grid gap-2">
                  <Label htmlFor="teamName">Teamname</Label>
                  <Input
                    id="teamName"
                    value={createTeamName}
                    onChange={(e) => setCreateTeamName(e.target.value)}
                    placeholder="z. B. HSG 1. Herren"
                    autoComplete="off"
                    disabled={isSubmitting || !teamsService}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting || !teamsService}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Erstelle…
                    </span>
                  ) : (
                    'Team erstellen'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="mt-4">
              <form className="flex flex-col gap-3" onSubmit={handleJoinTeam}>
                <div className="grid gap-2">
                  <Label htmlFor="inviteCode">Invite-Code</Label>
                  <Input
                    id="inviteCode"
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value)}
                    placeholder="z. B. 7K9P2QH3"
                    autoComplete="off"
                    disabled={isSubmitting || !teamsService}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting || !teamsService}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Trete bei…
                    </span>
                  ) : (
                    'Beitreten'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Button variant="secondary" onClick={handleLogout}>
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
