
'use client';

import { useState, useEffect } from 'react';

type SafeLocaleDateProps = {
  dateString: string;
  options?: Intl.DateTimeFormatOptions;
};

export function SafeLocaleDate({ dateString, options }: SafeLocaleDateProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // This effect runs only on the client, after hydration
    const date = new Date(dateString);
    if (options) {
      setFormattedDate(date.toLocaleString(undefined, options));
    } else {
      setFormattedDate(date.toLocaleDateString());
    }
  }, [dateString, options]);

  // Render a placeholder or nothing on the server and initial client render
  if (!formattedDate) {
    return null; // Or a loading skeleton
  }

  return <>{formattedDate}</>;
}
