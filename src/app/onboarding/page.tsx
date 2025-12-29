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
import { Loader2, AlertTriangle } from 'lucide-react';
import { TeamsService } from '@/services/teams.service';
import { useTeam } from '@/team';
import { useClub } from '@/club/club-provider';
import { useClubsService } from '@/services/clubs.service';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firebase = useFirebaseOptional();
  const { teamId, isTeamLoading, setTeamId, teamError } = useTeam();
  const { clubId, isClubLoading, setClubId, clubError } = useClub();
  const { toast } = useToast();

  const [createClubName, setCreateClubName] = useState('');
  const [createTeamName, setCreateTeamName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamsService = useMemo(() => {
    if (!firebase?.firestore) return null;
    return new TeamsService(firebase.firestore);
  }, [firebase?.firestore]);

  const clubsService = useClubsService();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.isAnonymous) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (isUserLoading || isTeamLoading || isClubLoading) return;
    if (teamId) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isTeamLoading, isClubLoading, teamId, router]);

  const handleLogout = async () => {
    if (!firebase?.auth) return;
    await signOut(firebase.auth);
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubsService || !user) return;

    const name = createClubName.trim();
    if (!name) {
        toast({ title: 'Name fehlt', description: 'Bitte gib einen Vereinsnamen ein.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    try {
      const result = await clubsService.createClub({ name, ownerUid: user.uid });
      if (!result.success || !result.data) throw result.error;
      
      setClubId(result.data.club.id);
      toast({ title: 'Verein erstellt', description: 'Du kannst nun ein Team erstellen.' });
    } catch (err) {
      toast({ title: 'Fehler', description: 'Verein konnte nicht erstellt werden.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
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
      const result = await teamsService.createTeam({ 
          name, 
          ownerUid: user.uid,
          clubId: clubId ?? undefined
      });
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

  if (isUserLoading || isTeamLoading || isClubLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const error = clubError || teamError;
  if (error) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-muted/40 p-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Ein Fehler ist aufgetreten</h2>
        <p className="max-w-md text-center text-muted-foreground">
          {error.message}
        </p>
        {error.message.includes('index') && (
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

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4">
        <Button variant="ghost" onClick={handleLogout}>
          Abmelden
        </Button>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col items-center space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tighter">Willkommen!</h1>
          <p className="text-muted-foreground">
            {clubId 
                ? 'Erstelle nun deine erste Mannschaft.' 
                : 'Lass uns deinen Verein einrichten.'}
          </p>
        </div>

        {!clubId ? (
            <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Verein gründen</TabsTrigger>
                <TabsTrigger value="join">Team beitreten</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create">
                <Card>
                <CardHeader>
                    <CardTitle>Neuen Verein erstellen</CardTitle>
                    <CardDescription>
                    Der Verein ist das Dach für deine Mannschaften.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateClub} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="clubName">Vereinsname</Label>
                        <Input
                        id="clubName"
                        placeholder="z.B. TSV Musterstadt"
                        value={createClubName}
                        onChange={(e) => setCreateClubName(e.target.value)}
                        disabled={isSubmitting}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting || !createClubName}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Verein erstellen
                    </Button>
                    </form>
                </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="join">
                <Card>
                <CardHeader>
                    <CardTitle>Einem Team beitreten</CardTitle>
                    <CardDescription>
                    Hast du einen Invite-Code? Tritt direkt einem Team bei.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleJoinTeam} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="inviteCode">Invite-Code</Label>
                        <Input
                        id="inviteCode"
                        placeholder="z.B. X7Y9Z2"
                        value={joinInviteCode}
                        onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                        disabled={isSubmitting}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting || !joinInviteCode}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Team beitreten
                    </Button>
                    </form>
                </CardContent>
                </Card>
            </TabsContent>
            </Tabs>
        ) : (
            <Card>
            <CardHeader>
                <CardTitle>Mannschaft erstellen</CardTitle>
                <CardDescription>
                Füge deinem Verein eine Mannschaft hinzu.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="teamName">Mannschaftsname</Label>
                    <Input
                    id="teamName"
                    placeholder="z.B. 1. Herren"
                    value={createTeamName}
                    onChange={(e) => setCreateTeamName(e.target.value)}
                    disabled={isSubmitting}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !createTeamName}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Mannschaft erstellen
                </Button>
                </form>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
