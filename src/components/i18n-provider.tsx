'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import '@/lib/i18n'; // Initialize i18n

interface I18nContextType {
    showLanguageName: boolean;
    setShowLanguageName: (show: boolean) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [showLanguageName, setShowLanguageName] = useState(true);

    // Load preference from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('showLanguageName');
        if (stored !== null) {
            setShowLanguageName(stored === 'true');
        }
    }, []);

    // Save preference to localStorage when changed
    const handleSetShowLanguageName = (show: boolean) => {
        setShowLanguageName(show);
        localStorage.setItem('showLanguageName', String(show));
    };

    return (
        <I18nContext.Provider value={{ showLanguageName, setShowLanguageName: handleSetShowLanguageName }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}
