'use client';

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // useEffect(() => {
  //   if (!isUserLoading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, isUserLoading, router]);

  // if (isUserLoading || !user) {
  //   return (
  //       <div className="flex min-h-screen w-full">
  //           <div className="hidden md:block border-r p-4">
  //               <div className="flex flex-col gap-4">
  //                   <Skeleton className="h-8 w-40" />
  //                   <Skeleton className="h-8 w-full" />
  //                   <Skeleton className="h-8 w-full" />
  //                   <Skeleton className="h-8 w-full" />
  //                   <Skeleton className="h-8 w-full" />
  //               </div>
  //           </div>
  //           <main className="flex-1 p-8">
  //               <Skeleton className="h-32 w-full" />
  //               <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
  //                   {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-60" />)}
  //               </div>
  //           </main>
  //       </div>
  //   );
  // }

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
