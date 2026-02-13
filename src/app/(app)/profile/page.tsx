'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/firebase/provider';
import { usePlayer, usePlayersService } from '@/services/players.service';
import { useTeam } from '@/team';
import { useAllFines } from '@/hooks/use-all-transactions';
import { updatePassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User, Wallet, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function ProfilePage() {
    const { t } = useTranslation();
    const { user: authUser } = useUser();
    const { teamId } = useTeam();
    const { data: player, isLoading: isPlayerLoading } = usePlayer(teamId, authUser?.uid);
    const playersService = usePlayersService(teamId);
    const { data: allFines } = useAllFines({ teamId });
    const { toast } = useToast();

    const { totalUnpaid, totalPaid } = useMemo(() => {
        if (!allFines || !authUser?.uid) return { totalUnpaid: 0, totalPaid: 0 };
        const userFines = allFines.filter(f => f.userId === authUser.uid);
        return {
            totalUnpaid: userFines.filter(f => !f.paid).reduce((sum, f) => sum + (f.amount - (f.amountPaid || 0)), 0),
            totalPaid: userFines.filter(f => f.paid).reduce((sum, f) => sum + f.amount, 0),
        };
    }, [allFines, authUser?.uid]);

    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (player) {
            setName(player.name || '');
            setNickname(player.nickname || '');
            setPhone(player.phone || '');
            setPhotoUrl(player.photoUrl || '');
            setNotes(player.notes || '');
        }
    }, [player]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser || !playersService) return;

        setIsSaving(true);
        try {
            if (player) {
                await playersService.updatePlayer(authUser.uid, {
                    name,
                    nickname,
                    phone,
                    photoUrl,
                    notes,
                });
            } else {
                // Create new profile
                await playersService.createPlayer({
                    name: name || authUser.email?.split('@')[0] || 'User',
                    nickname: nickname || '',
                    phone: phone || '',
                    photoUrl: photoUrl || '',
                    notes: notes || '',
                    email: authUser.email || '',
                    balance: 0,
                    active: true,
                }, { customId: authUser.uid });
            }

            toast({
                title: player ? t('profilePage.updated') : t('profilePage.created'),
                description: t('profilePage.saved'),
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: t('profilePage.error'),
                description: t('profilePage.updateError'),
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser) return;

        if (newPassword !== confirmPassword) {
            toast({
                title: t('profilePage.error'),
                description: t('profilePage.passwordMismatch'),
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: t('profilePage.error'),
                description: t('profilePage.passwordLength'),
                variant: "destructive",
            });
            return;
        }

        setIsChangingPassword(true);
        try {
            await updatePassword(authUser, newPassword);
            toast({
                title: "Success",
                description: t('profilePage.passwordSuccess'),
            });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Error updating password:", error);
            let errorMessage = t('profilePage.passwordUpdateError');
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = t('profilePage.reauthRequired');
            }
            toast({
                title: t('profilePage.error'),
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isPlayerLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!player) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">{t('profilePage.notFound')}</h2>
                <p className="text-muted-foreground mb-4">{t('profilePage.notFoundDesc')}</p>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('profilePage.create')}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('profilePage.title')}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('profilePage.currentBalance')}</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${player.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(player.balance || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('profilePage.availableCredit')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('profilePage.unpaidPenalties')}</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {formatCurrency(totalUnpaid)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('profilePage.outstandingAmount')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('profilePage.totalPaid')}</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(totalPaid)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('profilePage.lifetimeContribution')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <div className="col-span-4 md:col-span-3 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('profilePage.avatar')}</CardTitle>
                            <CardDescription>
                                {t('profilePage.avatarDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center space-y-4">
                            <Avatar className="h-32 w-32">
                                <AvatarImage src={photoUrl} alt={name} />
                                <AvatarFallback className="text-4xl">{name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h3 className="font-medium text-lg">{name}</h3>
                                <p className="text-sm text-muted-foreground">{authUser?.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('profilePage.security')}</CardTitle>
                            <CardDescription>
                                {t('profilePage.managePassword')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-password">{t('profilePage.newPassword')}</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-password">{t('profilePage.confirmPassword')}</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••"
                                    />
                                </div>
                                <Button type="submit" variant="outline" className="w-full" disabled={isChangingPassword || !newPassword}>
                                    {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {!isChangingPassword && <Lock className="mr-2 h-4 w-4" />}
                                    {t('profilePage.updatePassword')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>{t('profilePage.edit')}</CardTitle>
                        <CardDescription>
                            {t('profilePage.editDesc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">{t('profilePage.fullName')}</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">{t('profilePage.nickname')}</Label>
                                <Input
                                    id="nickname"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Johnny"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">{t('profilePage.phone')}</Label>
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="photoUrl">{t('profilePage.avatarUrl')}</Label>
                                <Input
                                    id="photoUrl"
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                />
                                <p className="text-[0.8rem] text-muted-foreground">
                                    {t('profilePage.avatarUrlDesc')}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">{t('profilePage.notes')}</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('profilePage.notesPlaceholder')}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {!isSaving && <Save className="mr-2 h-4 w-4" />}
                                {t('profilePage.saveChanges')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
