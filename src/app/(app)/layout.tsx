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
  // Die Authentifizierungsprüfung wurde vollständig entfernt, um die Entwicklung zu ermöglichen.
  // const router = useRouter();
  // const { user, isUserLoading } = useUser();

  // useEffect(() => {
  //   if (!isUserLoading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, isUserLoading, router]);

  // if (isUserLoading || !user) {
  //   return (
  //       <div className="flex min-h-screen w-full">
  //           {/* ... Skeleton-Code ... */}
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
