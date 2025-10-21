
'use client';

import { redirect } from "next/navigation";
import { useEffect } from "react";

// This page is no longer needed with static data. Redirect to dashboard.
export default function LoginPage() {
  useEffect(() => {
    redirect('/dashboard');
  }, []);

  return null;
}
