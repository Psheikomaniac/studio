'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
        <div className="flex min-h-screen w-full">
            <div className="hidden md:block border-r w-72 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-8 h-8" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex flex-col gap-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            </div>
            <div className="flex-1 p-8">
              <Skeleton className="h-16 w-full mb-8" />
              <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
               <Skeleton className="h-60 w-full" />
            </div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <Icons.Logo className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-headline font-semibold text-primary">
              balanceUp
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter className="p-4">
          <UserNav />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
