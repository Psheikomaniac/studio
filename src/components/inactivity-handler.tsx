'use client';

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function InactivityHandler() {
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only active when a user is logged in
        if (!user) return;

        const handleActivity = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
        };

        const handleLogout = async () => {
            try {
                await signOut(auth);
                router.push('/login');
            } catch (error) {
                console.error("Auto-logout failed:", error);
            }
        };

        // Initial timer start
        handleActivity();

        // Event listeners for user activity
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('scroll', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
        };
    }, [user, auth, router]);

    return null; // This component renders nothing
}
