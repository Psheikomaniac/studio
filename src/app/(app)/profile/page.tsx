'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { usePlayer, usePlayersService } from '@/services/players.service';
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
    const { user: authUser } = useUser();
    const { data: player, isLoading: isPlayerLoading } = usePlayer(authUser?.uid);
    const playersService = usePlayersService();
    const { toast } = useToast();

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
                    totalPaidPenalties: 0,
                    totalUnpaidPenalties: 0,
                    active: true,
                }, { customId: authUser.uid });
            }

            toast({
                title: player ? "Profile Updated" : "Profile Created",
                description: "Your changes have been saved successfully.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
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
                title: "Error",
                description: "Passwords do not match.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters.",
                variant: "destructive",
            });
            return;
        }

        setIsChangingPassword(true);
        try {
            await updatePassword(authUser, newPassword);
            toast({
                title: "Success",
                description: "Password updated successfully.",
            });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Error updating password:", error);
            let errorMessage = "Failed to update password.";
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = "Please log out and log in again to change your password.";
            }
            toast({
                title: "Error",
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
                <h2 className="text-2xl font-bold">Profile Not Found</h2>
                <p className="text-muted-foreground mb-4">Your player profile does not exist yet.</p>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Profile
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${player.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(player.balance || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Available credit
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unpaid Penalties</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {formatCurrency(player.totalUnpaidPenalties || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Outstanding amount
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(player.totalPaidPenalties || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Lifetime contribution
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <div className="col-span-4 md:col-span-3 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Avatar</CardTitle>
                            <CardDescription>
                                This is how you appear to others.
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
                            <CardTitle>Security</CardTitle>
                            <CardDescription>
                                Manage your password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirm-password">Confirm Password</Label>
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
                                    Update Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Edit Profile</CardTitle>
                        <CardDescription>
                            Update your personal information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">Nickname</Label>
                                <Input
                                    id="nickname"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Johnny"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="photoUrl">Avatar URL</Label>
                                <Input
                                    id="photoUrl"
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                />
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Enter a direct link to an image file.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add some notes about yourself..."
                                    className="min-h-[100px]"
                                />
                            </div>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {!isSaving && <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
