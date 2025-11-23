'use client';

import { useUser } from '@/firebase/provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isUserLoading && !user) {
            // Redirect to login if not authenticated
            // Store the attempted URL to redirect back after login (optional enhancement for later)
            router.push('/login');
        }
    }, [user, isUserLoading, router, pathname]);

    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If not loading and no user, we render nothing while redirecting
    if (!user) {
        return null;
    }

    return <>{children}</>;
}
