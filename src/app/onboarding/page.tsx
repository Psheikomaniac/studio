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
import type { Club, Team } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const [clubSuggestions, setClubSuggestions] = useState<Club[]>([]);
  const [isClubSearching, setIsClubSearching] = useState(false);

  const [clubTeams, setClubTeams] = useState<Team[]>([]);
  const [isClubTeamsLoading, setIsClubTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState('');

  const teamsService = useMemo(() => {
    if (!firebase?.firestore) return null;
    return new TeamsService(firebase.firestore);
  }, [firebase?.firestore]);

  const clubsService = useClubsService();

  const filteredClubTeams = useMemo(() => {
    const term = teamSearch.trim().toLowerCase();
    if (!term) return clubTeams;
    return clubTeams.filter((t) => (t.name ?? '').toLowerCase().includes(term));
  }, [clubTeams, teamSearch]);

  useEffect(() => {
    if (!clubsService) return;

    const term = createClubName.trim();
    if (term.length < 3) {
      setClubSuggestions([]);
      setIsClubSearching(false);
      return;
    }

    let active = true;
    setIsClubSearching(true);

    const t = setTimeout(async () => {
      const res = await clubsService.searchClubsByNamePrefix({ prefix: term, limit: 8 });
      if (!active) return;

      if (res.success) {
        setClubSuggestions(res.data ?? []);
      } else {
        setClubSuggestions([]);
      }
      setIsClubSearching(false);
    }, 250);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [clubsService, createClubName]);

  useEffect(() => {
    if (!teamsService) return;
    if (!clubId) return;

    let active = true;
    setIsClubTeamsLoading(true);

    (async () => {
      const res = await teamsService.listTeamsByClubId({ clubId, limit: 200 });
      if (!active) return;

      if (res.success) {
        const teams = (res.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
        setClubTeams(teams);
      } else {
        setClubTeams([]);
      }
      setIsClubTeamsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [teamsService, clubId]);

  useEffect(() => {
    setSelectedTeamId('');
    setTeamSearch('');
  }, [clubId]);

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
    } catch {
      toast({ title: 'Fehler', description: 'Verein konnte nicht erstellt werden.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExistingClub = async (club: Club) => {
    if (!clubsService || !user) return;
    setIsSubmitting(true);
    try {
      const membershipRes = await clubsService.addMember({ clubId: club.id, uid: user.uid, role: 'member' });
      if (!membershipRes.success) {
        throw membershipRes.error ?? new Error('Verein konnte nicht ausgewählt werden.');
      }

      setClubId(club.id);
      setClubSuggestions([]);
      toast({ title: 'Verein ausgewählt', description: club.name });
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExistingTeam = async () => {
    if (!teamsService || !user) return;
    if (!selectedTeamId) {
      toast({
        title: 'Mannschaft fehlt',
        description: 'Bitte wähle eine Mannschaft aus.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const memberRes = await teamsService.addMember({ teamId: selectedTeamId, uid: user.uid, role: 'member' });
      if (!memberRes.success) {
        throw memberRes.error ?? new Error('Beitritt zur Mannschaft fehlgeschlagen.');
      }

      setTeamId(selectedTeamId);
      router.push('/dashboard');
    } catch (err) {
      toast({
        title: 'Fehler',
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamsService || !user) return;

    if (!clubId) {
      toast({
        title: 'Verein fehlt',
        description: 'Bitte wähle zuerst einen Verein aus.',
        variant: 'destructive',
      });
      return;
    }

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
        clubId,
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

                        {isClubSearching ? (
                          <p className="text-xs text-muted-foreground">Suche nach bestehenden Vereinen…</p>
                        ) : null}

                        {clubSuggestions.length > 0 ? (
                          <div className="rounded-md border bg-background">
                            <div className="px-3 py-2 text-xs text-muted-foreground">Vorschläge</div>
                            <div className="max-h-48 overflow-auto">
                              {clubSuggestions.map((club) => (
                                <button
                                  key={club.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                                  disabled={isSubmitting}
                                  onClick={() => handleSelectExistingClub(club)}
                                >
                                  {club.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
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
                <Tabs defaultValue={clubTeams.length > 0 ? 'select' : 'create'} className="w-full">
                  {clubTeams.length > 0 ? (
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="select">Auswählen</TabsTrigger>
                      <TabsTrigger value="create">Neu erstellen</TabsTrigger>
                    </TabsList>
                  ) : null}

                  <TabsContent value="select">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Mannschaft auswählen</Label>
                        <Input
                          placeholder="Suche… (z.B. WBW, 2. Herren)"
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          disabled={isSubmitting || isClubTeamsLoading}
                        />
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={isSubmitting || isClubTeamsLoading}>
                          <SelectTrigger>
                            <SelectValue placeholder={isClubTeamsLoading ? 'Lade…' : 'Bitte auswählen'} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredClubTeams.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">Keine Treffer</div>
                            ) : (
                              filteredClubTeams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" className="w-full" disabled={isSubmitting || !selectedTeamId} onClick={handleSelectExistingTeam}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Mannschaft auswählen
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="create">
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
                  </TabsContent>
                </Tabs>
            </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
