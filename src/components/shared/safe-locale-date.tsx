
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type SafeLocaleDateProps = {
  dateString: string;
  options?: Intl.DateTimeFormatOptions;
};

export function SafeLocaleDate({ dateString, options }: SafeLocaleDateProps) {
  const [formattedDate, setFormattedDate] = useState('');
  const { i18n } = useTranslation();

  useEffect(() => {
    // This effect runs only on the client, after hydration
    const date = new Date(dateString);
    if (options) {
      setFormattedDate(date.toLocaleString(i18n.language, options));
    } else {
      setFormattedDate(date.toLocaleDateString(i18n.language));
    }
  }, [dateString, options, i18n.language]);

  // Render a placeholder or nothing on the server and initial client render
  if (!formattedDate) {
    return null; // Or a loading skeleton
  }

  return <>{formattedDate}</>;
}
