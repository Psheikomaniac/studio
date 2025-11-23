'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LogoutButton() {
    const { t } = useTranslation();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
        >
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.logout')}
        </Button>
    );
}
