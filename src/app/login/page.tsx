'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, useUser } from '@/firebase/provider';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, collectionGroup, query, where, limit, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading, userError } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already logged in (but not if anonymous)
  useEffect(() => {
    if (user && !isUserLoading && firestore) {
      if (user.isAnonymous) {
        // If we find an anonymous user on the login page, sign them out
        // This clears the "ghost" session
        signOut(auth).catch(err => console.error("Failed to sign out anonymous user", err));
      } else {
        setIsRedirecting(true);
        const checkAndRedirect = async () => {
          try {
            // Check if user has any team membership
            const q = query(collectionGroup(firestore, 'teamMembers'), where('uid', '==', user.uid), limit(1));
            const snap = await getDocs(q);

            if (snap.empty) {
              router.push('/onboarding');
            } else {
              router.push('/dashboard');
            }
          } catch (error) {
            console.error("Redirect check failed", error);
            // Fallback to onboarding - new users without team membership should complete onboarding
            // The TeamGuard will redirect to dashboard if user already has a team
            router.push('/onboarding');
          }
        };
        checkAndRedirect();
      }
    }
  }, [user, isUserLoading, router, auth, firestore]);

  // Handle auth errors from the provider
  useEffect(() => {
    if (userError) {
      setIsLoading(false);
      toast({
        title: t('authError'),
        description: userError.message,
        variant: "destructive",
      });
    }
  }, [userError, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success will trigger the auth state listener and redirect
    } catch (error: any) {
      setIsLoading(false);
      let errorMessage = t('failedToSignIn');

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = t('invalidCredential');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('tooManyRequests');
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: t('loginFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Create user document in Firestore
      // We need to use the non-blocking update or a direct setDoc here
      // Since we don't have the PlayersService initialized here easily without context,
      // we'll use a direct import or rely on a trigger. 
      // However, for client-side simplicity, let's try to set it if we can access firestore.
      // But `useFirebase` hook is available.

      // Better approach: The ProfilePage should handle "missing profile" by allowing creation.
      // OR we do it here. Let's do it here for a better UX.

      // We need firestore instance.
      // We can get it from useFirebase() but we are inside a function.
      // We can use the hook at top level.

      // Success will trigger the auth state listener and redirect
    } catch (error: any) {
      setIsLoading(false);
      let errorMessage = t('failedToCreateAccount');

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('emailInUse');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('weakPassword');
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: t('signUpFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isUserLoading || isRedirecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Icons.Logo className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('welcomeBack')}</CardTitle>
          <CardDescription>
            {t('enterEmailToSignIn')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">{t('login')}</TabsTrigger>
              <TabsTrigger value="register">{t('signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('signIn')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">{t('email')}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">{t('password')}</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-muted-foreground text-center">
            {t('termsAgreement')}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
